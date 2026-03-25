import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReportesService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Obtiene toda la información necesaria para generar un boletín detallado
   */
  async getDatosBoletin(estudianteId: string, periodoId?: string) {
    console.log('📊 getDatosBoletin called with:', { estudianteId, periodoId });

    try {
      // 1. Datos del estudiante
      const { data: estudiante, error: estErr } = await this.supabase.admin
        .from('estudiante')
        .select('*')
        .eq('id', estudianteId)
        .single();

      console.log('📝 Estudiante query:', { estErr, estudiante });

      if (estErr || !estudiante) {
        throw new NotFoundException('Estudiante no encontrado');
      }

      // 2. Notas
      let notasQuery = this.supabase.admin
        .from('nota_periodo')
        .select(`
          nota_final, desempeno, observacion_docente,
          asignatura:asignatura_id(nombre),
          periodo:periodo_academico_id(nombre, numero)
        `)
        .eq('estudiante_id', estudianteId);

      if (periodoId && periodoId.trim() !== '') {
        notasQuery = notasQuery.eq('periodo_academico_id', periodoId);
      }

      const { data: notas, error: notaErr } = await notasQuery;
      console.log('📋 Notas query:', { notaErr, count: notas?.length });

      // 3. Asistencia
      let asistenciaQuery = this.supabase.admin
        .from('asistencia')
        .select('estado')
        .eq('estudiante_id', estudianteId);

      if (periodoId && periodoId.trim() !== '') {
        asistenciaQuery = asistenciaQuery.eq('periodo_academico_id', periodoId);
      }

      const { data: asistencia } = await asistenciaQuery;

      // 4. Observaciones
      const { data: anotaciones } = await this.supabase.admin
        .from('observacion')
        .select('tipo, descripcion, fecha')
        .eq('estudiante_id', estudianteId)
        .order('fecha', { ascending: false });

      return {
        estudiante,
        calificaciones: notas || [],
        estadisticas: {
          inasistencias: asistencia?.filter(a => a.estado === 'Ausente').length || 0,
          tardanzas: asistencia?.filter(a => a.estado === 'Tardanza').length || 0,
        },
        observaciones_convivencia: anotaciones || []
      };
    } catch (error) {
      console.error('❌ Error in getDatosBoletin:', error);
      throw error;
    }
  }

  /**
   * Genera estadísticas de rendimiento para un grupo completo
   */
  async getEstadisticasGrupo(grupoId: string, periodoId?: string) {
    // Obtener estudiantes del grupo
    const { data: matriculas } = await this.supabase.admin
      .from('matricula')
      .select('estudiante_id, grupo_id')
      .eq('grupo_id', grupoId)
      .eq('estado', 'Activa');

    if (!matriculas || matriculas.length === 0) {
      return {
        cantidad_estudiantes: 0,
        promedio_notas: 0,
        promedio_asistencia: 0
      };
    }

    const estudianteIds = matriculas.map(m => m.estudiante_id);

    // Calcular promedio de notas
    let notasQuery = this.supabase.admin
      .from('nota_periodo')
      .select('nota_final')
      .in('estudiante_id', estudianteIds);

    if (periodoId) {
      notasQuery = notasQuery.eq('periodo_academico_id', periodoId);
    }

    const { data: notas } = await notasQuery;
    const promedioNotas = notas && notas.length > 0
      ? notas.reduce((acc, n) => acc + (n.nota_final || 0), 0) / notas.length
      : 0;

    // Calcular asistencia
    let asistenciaQuery = this.supabase.admin
      .from('asistencia')
      .select('estado')
      .in('estudiante_id', estudianteIds);

    if (periodoId) {
      asistenciaQuery = asistenciaQuery.eq('periodo_academico_id', periodoId);
    }

    const { data: asis } = await asistenciaQuery;
    const promedioAsistencia = asis && asis.length > 0
      ? (asis.filter(a => a.estado === 'Presente').length / asis.length) * 100
      : 0;

    return {
      cantidad_estudiantes: matriculas.length,
      promedio_notas: Math.round(promedioNotas * 100) / 100,
      promedio_asistencia: Math.round(promedioAsistencia * 10) / 10
    };
  }

  /**
   * Dashboard administrativo con métricas clave
   */
  async getDashboardStats() {
    const { count: totalEstudiantes } = await this.supabase.admin.from('estudiante').select('*', { count: 'exact', head: true });
    const { count: totalEmpleados } = await this.supabase.admin.from('empleado').select('*', { count: 'exact', head: true });
    
    // Recaudos del mes actual
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
    
    const { data: pagos } = await this.supabase.admin
      .from('pago')
      .select('valor')
      .gte('fecha_pago', inicioMes);

    const recaudoMes = pagos?.reduce((acc, p) => acc + p.valor, 0) || 0;

    return {
      matriculados: totalEstudiantes,
      personal: totalEmpleados,
      financiero: {
        recaudo_mes_actual: recaudoMes,
      },
      alertas: {
        stock_bajo: 0, // Aquí iría consulta a Inventario
      }
    };
  }
}
