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
      .select('*, padre:padre_id(codigo, nombre)')
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
      .select('*, padre:padre_id(codigo, nombre), hijos:cuenta_contable!padre_id(*)')
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
    return data;
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
      saldos[mov.cuenta_contable_id].debe += mov.debe || 0;
      saldos[mov.cuenta_contable_id].haber += mov.haber || 0;
    }

    const balance = (cuentas || []).map((cuenta) => {
      const sal = saldos[cuenta.id] || { debe: 0, haber: 0 };
      const saldo = cuenta.naturaleza === 'Débito'
        ? sal.debe - sal.haber
        : sal.haber - sal.debe;

      return {
        ...cuenta,
        debe: sal.debe,
        haber: sal.haber,
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
}