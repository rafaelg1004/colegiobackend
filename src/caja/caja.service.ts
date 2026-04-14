// ================================================
// src/caja/caja.service.ts - Contabilidad Simple para Colegio
// ================================================
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
  'Otro Ingreso',
];

const CONCEPTOS_EGRESO = [
  'Nómina Docentes',
  'Nómina Administrativos',
  'Servicios Públicos',
  'Arriendo',
  'Suministros Oficina',
  'Mantenimiento',
  'Otro Gasto',
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
  // BUSCAR ESTUDIANTES
  // ======================
  async buscarEstudiantes(buscar: string) {
    const query = this.supabase.admin.query;
    const sql = `
      SELECT 
        e.id,
        e.primer_nombre,
        e.segundo_nombre,
        e.primer_apellido,
        e.segundo_apellido,
        e.numero_documento,
        e.tipo_documento,
        (
          SELECT json_build_object(
            'id', m.id,
            'grupo', json_build_object(
              'nombre', g.nombre,
              'grado', json_build_object('nombre', gr.nombre)
            )
          )
          FROM matricula m
          LEFT JOIN grupo g ON m.grupo_id = g.id
          LEFT JOIN grado gr ON g.grado_id = gr.id
          WHERE m.estudiante_id = e.id
          ORDER BY m.fecha_matricula DESC
          LIMIT 1
        ) as matricula
      FROM estudiante e
      WHERE e.estado = 'Activo'
        AND (
          e.primer_nombre ILIKE $1 
          OR e.primer_apellido ILIKE $1 
          OR e.numero_documento ILIKE $1
        )
      ORDER BY e.primer_apellido, e.primer_nombre
      LIMIT 20
    `;
    const { data, error } = await query(sql, [`%${buscar}%`]);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ======================
  // GENERAR NÚMERO DE COMPROBANTE
  // ======================
  async generarNumeroComprobante(): Promise<string> {
    console.log('=== generarNumeroComprobante llamado ===');
    const query = this.supabase.admin.query;
    const fecha = new Date();
    const prefijo = `REC-${fecha.getFullYear()}`;
    console.log('Prefijo:', prefijo);

    // Obtener el último número de comprobante del año
    const sql = `
      SELECT MAX(CAST(SUBSTRING(numero_comprobante FROM '[0-9]+$') AS INTEGER)) as ultimo
      FROM movimiento_caja 
      WHERE numero_comprobante LIKE $1
    `;
    console.log('SQL generarNumeroComprobante:', sql);
    const { data, error } = await query(sql, [`${prefijo}-%`]);
    console.log('Resultado SQL:', { data, error });
    if (error) throw new BadRequestException(error.message);

    const ultimo = data?.[0]?.ultimo || 0;
    const nuevo = ultimo + 1;
    return `${prefijo}-${nuevo.toString().padStart(6, '0')}`;
  }

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

  async crearMovimiento(movimiento: MovimientoCaja, usuarioId?: string) {
    console.log('=== crearMovimiento llamado ===');
    console.log('Movimiento recibido:', JSON.stringify(movimiento, null, 2));
    console.log('Usuario ID:', usuarioId);

    // Validar que el monto sea positivo
    if (movimiento.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    // Generar número de comprobante para cualquier tipo de movimiento
    const numeroComprobante = await this.generarNumeroComprobante();

    const query = this.supabase.admin.query;

    // Insertar con SQL directo
    const sql = `
      INSERT INTO movimiento_caja (
        tipo,
        concepto,
        monto,
        fecha,
        observacion,
        estudiante_id,
        estudiante_nombre,
        numero_comprobante,
        registrado_por,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    const params = [
      movimiento.tipo,
      movimiento.concepto,
      movimiento.monto,
      movimiento.fecha,
      movimiento.observacion || null,
      movimiento.estudiante_id || null,
      movimiento.estudiante_nombre || null,
      numeroComprobante,
      usuarioId || null,
    ];

    const { data, error } = await query(sql, params);
    if (error) {
      console.error('=== ERROR SQL MOVIMIENTO CAJA ===');
      console.error('SQL:', sql);
      console.error('Params:', params);
      console.error('Error completo:', error);
      throw new BadRequestException(error.message);
    }

    // Buscar el correo del usuario para mostrar en el comprobante
    let usuarioEmail = null;
    if (usuarioId) {
      const { data: userData } = await this.supabase.admin
        .from('users')
        .select('email')
        .eq('id', usuarioId)
        .single();
      usuarioEmail = userData?.email || null;
    }

    return {
      message: 'Movimiento registrado',
      data: {
        ...data?.[0],
        registrado_por_email: usuarioEmail,
      },
    };
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
    const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO');
    const egresos = movimientos.filter((m) => m.tipo === 'EGRESO');

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
    const agrupado: Record<
      string,
      { concepto: string; monto: number; cantidad: number }
    > = {};

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
