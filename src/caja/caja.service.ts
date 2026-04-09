// ================================================
// src/caja/caja.service.ts - Contabilidad Simple para Colegio
// ================================================
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Conceptos predefinidos para colegio pequeño
const CONCEPTOS_INGRESO = [
  'Matrícula',
  'Pensión Mensual',
  'Meriendas',
  'Libros',
  'Uniformes',
  'Formularios',
  'Derecho a Grado',
  'Clausura/Graduación',
  'Otro Ingreso'
];

const CONCEPTOS_EGRESO = [
  'Nómina Docentes',
  'Nómina Administrativos',
  'Servicios Públicos',
  'Arriendo',
  'Suministros Oficina',
  'Mantenimiento',
  'Otro Gasto'
];

interface MovimientoCaja {
  id?: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  estudiante_id?: string;
  estudiante_nombre?: string;
  observacion?: string;
  registrado_por?: string;
}

@Injectable()
export class CajaService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // MOVIMIENTOS DE CAJA
  // ======================

  async getMovimientos(filtros: {
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo?: 'INGRESO' | 'EGRESO';
    concepto?: string;
  }) {
    let qb = this.supabase.admin
      .from('movimiento_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (filtros.fecha_desde) qb = qb.gte('fecha', filtros.fecha_desde);
    if (filtros.fecha_hasta) qb = qb.lte('fecha', filtros.fecha_hasta);
    if (filtros.tipo) qb = qb.eq('tipo', filtros.tipo);
    if (filtros.concepto) qb = qb.eq('concepto', filtros.concepto);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async crearMovimiento(movimiento: MovimientoCaja) {
    // Validar que el monto sea positivo
    if (movimiento.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    const { data, error } = await this.supabase.admin
      .from('movimiento_caja')
      .insert(movimiento)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Movimiento registrado', data };
  }

  async eliminarMovimiento(id: string) {
    const { error } = await this.supabase.admin
      .from('movimiento_caja')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Movimiento eliminado' };
  }

  // ======================
  // RESUMEN Y REPORTES
  // ======================

  async getResumen(fecha_desde?: string, fecha_hasta?: string) {
    // Obtener movimientos del período
    const movimientos = await this.getMovimientos({ fecha_desde, fecha_hasta });

    // Calcular totales
    const ingresos = movimientos.filter(m => m.tipo === 'INGRESO');
    const egresos = movimientos.filter(m => m.tipo === 'EGRESO');

    const totalIngresos = ingresos.reduce((sum, m) => sum + (m.monto || 0), 0);
    const totalEgresos = egresos.reduce((sum, m) => sum + (m.monto || 0), 0);

    // Agrupar por concepto
    const porConceptoIngreso = this.agruparPorConcepto(ingresos);
    const porConceptoEgreso = this.agruparPorConcepto(egresos);

    return {
      periodo: {
        desde: fecha_desde || 'Inicio',
        hasta: fecha_hasta || 'Hoy',
      },
      totales: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        balance: totalIngresos - totalEgresos,
        cantidad_ingresos: ingresos.length,
        cantidad_egresos: egresos.length,
      },
      por_concepto: {
        ingresos: porConceptoIngreso,
        egresos: porConceptoEgreso,
      },
      movimientos: movimientos.slice(0, 50), // Últimos 50 para el detalle
    };
  }

  async getReporteMensual(anio: number, mes: number) {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-31`;
    
    return this.getResumen(desde, hasta);
  }

  private agruparPorConcepto(movimientos: any[]) {
    const agrupado: Record<string, { concepto: string; monto: number; cantidad: number }> = {};
    
    for (const m of movimientos) {
      if (!agrupado[m.concepto]) {
        agrupado[m.concepto] = { concepto: m.concepto, monto: 0, cantidad: 0 };
      }
      agrupado[m.concepto].monto += m.monto || 0;
      agrupado[m.concepto].cantidad += 1;
    }
    
    return Object.values(agrupado).sort((a, b) => b.monto - a.monto);
  }

  // ======================
  // UTILIDADES
  // ======================

  getConceptos() {
    return {
      ingresos: CONCEPTOS_INGRESO,
      egresos: CONCEPTOS_EGRESO,
    };
  }
}
