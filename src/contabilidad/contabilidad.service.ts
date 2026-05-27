import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateCuentaContableDto, UpdateCuentaContableDto,
  CreateMovimientoContableDto, QueryCuentaContableDto, QueryMovimientoContableDto
} from './dto/contabilidad.dto';

@Injectable()
export class ContabilidadService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // CUENTAS CONTABLES
  // ======================

  async getCuentas(filtros: QueryCuentaContableDto) {
    let qb = this.supabase.admin
      .from('cuenta_contable')
      .select('*')
      .order('codigo');

    if (filtros.tipo) qb = qb.eq('tipo', filtros.tipo);
    if (filtros.naturaleza) qb = qb.eq('naturaleza', filtros.naturaleza);
    if (filtros.buscar) {
      qb = qb.or(`codigo.ilike.%${filtros.buscar}%,nombre.ilike.%${filtros.buscar}%`);
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getCuenta(id: string) {
    const { data, error } = await this.supabase.admin
      .from('cuenta_contable')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Cuenta contable no encontrada');
    return data;
  }

  async crearCuenta(dto: CreateCuentaContableDto) {
    // Verificar código único
    const { data: existente } = await this.supabase.admin
      .from('cuenta_contable')
      .select('id')
      .eq('codigo', dto.codigo)
      .single();

    if (existente) throw new ConflictException('Ya existe una cuenta contable con este código');

    const { data, error } = await this.supabase.admin
      .from('cuenta_contable')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Cuenta contable creada', data };
  }

  async updateCuenta(id: string, dto: UpdateCuentaContableDto) {
    // Verificar código único si se cambia
    if (dto.codigo) {
      const { data: existente } = await this.supabase.admin
        .from('cuenta_contable')
        .select('id')
        .eq('codigo', dto.codigo)
        .neq('id', id)
        .single();

      if (existente) throw new ConflictException('Ya existe otra cuenta con este código');
    }

    const { data, error } = await this.supabase.admin
      .from('cuenta_contable')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Cuenta contable no encontrada');
    return { message: 'Cuenta contable actualizada', data };
  }

  async deleteCuenta(id: string) {
    // Verificar si tiene hijos
    const { data: hijos } = await this.supabase.admin
      .from('cuenta_contable')
      .select('id')
      .eq('padre_id', id)
      .limit(1);

    if (hijos && hijos.length > 0) {
      throw new BadRequestException('No se puede eliminar una cuenta que tiene subcuentas');
    }

    // Verificar si tiene movimientos
    const { data: movimientos } = await this.supabase.admin
      .from('movimiento_contable')
      .select('id')
      .eq('cuenta_contable_id', id)
      .limit(1);

    if (movimientos && movimientos.length > 0) {
      throw new BadRequestException('No se puede eliminar una cuenta con movimientos asociados');
    }

    const { data, error } = await this.supabase.admin
      .from('cuenta_contable')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Cuenta contable eliminada', data };
  }

  // ======================
  // MOVIMIENTOS CONTABLES
  // ======================

  async getMovimientos(filtros: QueryMovimientoContableDto) {
    let qb = this.supabase.admin
      .from('movimiento_contable')
      .select(`
        *,
        cuenta:cuenta_contable_id(codigo, nombre, tipo, naturaleza),
        factura:factura_id(numero_factura),
        pago:pago_id(id),
        nomina:nomina_id(id, periodo_mes, periodo_anio)
      `)
      .order('fecha', { ascending: false })
      .limit(100);

    if (filtros.cuenta_contable_id) qb = qb.eq('cuenta_contable_id', filtros.cuenta_contable_id);
    if (filtros.factura_id) qb = qb.eq('factura_id', filtros.factura_id);
    if (filtros.pago_id) qb = qb.eq('pago_id', filtros.pago_id);
    if (filtros.nomina_id) qb = qb.eq('nomina_id', filtros.nomina_id);
    if (filtros.fecha_desde) qb = qb.gte('fecha', filtros.fecha_desde);
    if (filtros.fecha_hasta) qb = qb.lte('fecha', filtros.fecha_hasta);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    
    // El mock DatabaseService devuelve arreglos para las relaciones 1:1, los desempaquetamos
    const dataUnwrapped = data?.map(mov => ({
      ...mov,
      cuenta: Array.isArray(mov.cuenta) ? mov.cuenta[0] : mov.cuenta,
      factura: Array.isArray(mov.factura) ? mov.factura[0] : mov.factura,
      pago: Array.isArray(mov.pago) ? mov.pago[0] : mov.pago,
      nomina: Array.isArray(mov.nomina) ? mov.nomina[0] : mov.nomina,
    }));

    return dataUnwrapped;
  }

  async crearMovimiento(dto: CreateMovimientoContableDto) {
    const { data, error } = await this.supabase.admin
      .from('movimiento_contable')
      .insert(dto)
      .select(`
        *,
        cuenta:cuenta_contable_id(codigo, nombre)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    
    // Desempaquetar la cuenta si viene como arreglo
    if (data && Array.isArray(data.cuenta)) {
      data.cuenta = data.cuenta[0];
    }
    
    return { message: 'Movimiento contable registrado', data };
  }

  // ======================
  // REPORTES CONTABLES
  // ======================

  async getBalanceComprobacion(fechaDesde?: string, fechaHasta?: string) {
    // Obtener todas las cuentas con sus movimientos
    const { data: cuentas } = await this.supabase.admin
      .from('cuenta_contable')
      .select('*')
      .order('codigo');

    let qb = this.supabase.admin
      .from('movimiento_contable')
      .select('cuenta_contable_id, debe, haber');

    if (fechaDesde) qb = qb.gte('fecha', fechaDesde);
    if (fechaHasta) qb = qb.lte('fecha', fechaHasta);

    const { data: movimientos } = await qb;

    // Calcular saldo por cuenta
    const saldos: Record<string, { debe: number; haber: number }> = {};
    for (const mov of movimientos || []) {
      if (!saldos[mov.cuenta_contable_id]) {
        saldos[mov.cuenta_contable_id] = { debe: 0, haber: 0 };
      }
      saldos[mov.cuenta_contable_id].debe += Number(mov.debe || 0);
      saldos[mov.cuenta_contable_id].haber += Number(mov.haber || 0);
    }

    const balance = (cuentas || []).map((cuenta) => {
      // Sumar los movimientos directos y los de todas sus subcuentas (su código es prefijo)
      const descendientes = cuentas.filter(c => c.codigo.startsWith(cuenta.codigo));
      
      let totalDebe = 0;
      let totalHaber = 0;
      
      for (const desc of descendientes) {
        const sal = saldos[desc.id];
        if (sal) {
          totalDebe += sal.debe;
          totalHaber += sal.haber;
        }
      }

      const saldo = cuenta.naturaleza === 'Débito'
        ? totalDebe - totalHaber
        : totalHaber - totalDebe;

      return {
        ...cuenta,
        debe: totalDebe,
        haber: totalHaber,
        saldo,
      };
    });

    const totalDebe = Object.values(saldos).reduce((s, v) => s + v.debe, 0);
    const totalHaber = Object.values(saldos).reduce((s, v) => s + v.haber, 0);

    return {
      cuentas: balance,
      totales: { debe: totalDebe, haber: totalHaber },
    };
  }

  // ======================
  // MÉTRICAS FINANCIERAS
  // ======================

  async getMetricasFinancieras() {
    // 1. Cuentas y Movimientos del año actual
    const yearStart = new Date().getFullYear() + '-01-01';
    const { data: cuentasData } = await this.supabase.admin.from('cuenta_contable').select('*');
    const cuentas = cuentasData || [];
    
    const { data: movimientosData } = await this.supabase.admin
      .from('movimiento_contable')
      .select('*')
      .gte('fecha', yearStart);
    const movimientos = movimientosData || [];

    // Mapear cuentas por ID
    const cuentasMap: Record<string, any> = {};
    cuentas.forEach((c: any) => cuentasMap[c.id] = c);

    // Inicializar agrupadores
    const ingresosPorMes: Record<string, number> = {};
    const gastosPorMes: Record<string, number> = {};
    const distribucionGastosObj: Record<string, number> = {};
    let flujoEfectivo = 0;

    // Constantes meses
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // 2. Facturas para Cartera y Proyección
    const { data: facturasData } = await this.supabase.admin.from('factura').select('*').gte('created_at', yearStart);
    const facturas = facturasData || [];
    
    let carteraPendiente = 0;
    let proyeccionTotal = 0;
    let proyeccionRecaudado = 0;

    // Procesar Facturas
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    facturas.forEach((factura: any) => {
      const total = Number(factura.total || 0);
      const pagado = Number(factura.monto_pagado || 0);
      
      // Cartera (estado Pendiente o Parcial)
      if (factura.estado === 'Pendiente' || factura.estado === 'Parcial') {
        carteraPendiente += (total - pagado);
      }

      // Proyección (solo facturas emitidas este mes)
      const fDate = new Date(factura.created_at || factura.fecha_emision);
      if (fDate.getMonth() === currentMonth) {
        proyeccionTotal += total;
        proyeccionRecaudado += pagado;
      }
    });

    // Procesar Movimientos
    movimientos.forEach((mov: any) => {
      const cuenta = cuentasMap[mov.cuenta_contable_id];
      if (!cuenta) return;
      
      const mDate = new Date(mov.fecha);
      const mesKey = meses[mDate.getMonth()];
      
      const debe = Number(mov.debe || 0);
      const haber = Number(mov.haber || 0);

      // Ingresos (clase 4)
      if (cuenta.codigo.startsWith('4')) {
        ingresosPorMes[mesKey] = (ingresosPorMes[mesKey] || 0) + (haber - debe); // Naturaleza Crédito
      }
      
      // Gastos (clase 5)
      if (cuenta.codigo.startsWith('5')) {
        const saldoGasto = debe - haber; // Naturaleza Débito
        gastosPorMes[mesKey] = (gastosPorMes[mesKey] || 0) + saldoGasto;
        
        // Distribución: Agrupar por cuenta principal (4 dígitos)
        const principalCode = cuenta.codigo.substring(0, 4);
        const parentCuenta = cuentas.find((c: any) => c.codigo === principalCode);
        const label = parentCuenta ? parentCuenta.nombre : cuenta.nombre;
        distribucionGastosObj[label] = (distribucionGastosObj[label] || 0) + saldoGasto;
      }
    });

    // Calcular Flujo de Efectivo en cuentas de clase 11 (Caja y Bancos) - histórico total
    const { data: todosMovimientosData } = await this.supabase.admin.from('movimiento_contable').select('cuenta_contable_id, debe, haber');
    const todosMovimientos = todosMovimientosData || [];
    
    todosMovimientos.forEach((mov: any) => {
      const cuenta = cuentasMap[mov.cuenta_contable_id];
      if (!cuenta) return;
      if (cuenta.codigo.startsWith('11')) {
         flujoEfectivo += (Number(mov.debe || 0) - Number(mov.haber || 0));
      }
    });

    // Formatear arreglos para Chart.js
    const ingresosVsGastos = meses.map(mes => ({
      mes,
      ingresos: ingresosPorMes[mes] || 0,
      gastos: gastosPorMes[mes] || 0
    }));

    // Top 5 gastos para la dona (y agrupar resto en "Otros")
    const gastosSorted = Object.entries(distribucionGastosObj)
      .sort((a, b) => b[1] - a[1]);
      
    let distribucionGastos = gastosSorted.slice(0, 5).map(([name, value]) => ({ name, value }));
    const otrosGastos = gastosSorted.slice(5).reduce((sum, [, val]) => sum + val, 0);
    if (otrosGastos > 0) {
       distribucionGastos.push({ name: 'Otros', value: otrosGastos });
    }

    return {
      ingresosVsGastos,
      distribucionGastos,
      flujoEfectivo,
      carteraPendiente,
      proyeccion: {
        total: proyeccionTotal,
        recaudado: proyeccionRecaudado,
        porcentaje: proyeccionTotal > 0 ? (proyeccionRecaudado / proyeccionTotal) * 100 : 0
      }
    };
  }
}