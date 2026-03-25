import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateActividadDto, RegistrarNotasDto, UpdateNotaDto } from './dto/calificacion.dto';

@Injectable()
export class CalificacionesService {
  constructor(private supabase: SupabaseService) {}

  async crearActividad(dto: CreateActividadDto) {
    const { data, error } = await this.supabase.admin
      .from('actividad_evaluativa')
      .insert(dto)
      .select(`
        *,
        tipo_actividad:tipo_actividad_id(nombre),
        asignatura:asignatura_id(nombre),
        grupo:grupo_id(nombre, grado:grado_id(nombre)),
        periodo:periodo_academico_id(nombre, numero)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Actividad evaluativa creada', data };
  }

  async getActividadesPorGrupo(grupoId: string, periodoId: string, asignaturaId?: string) {
    let qb = this.supabase.admin
      .from('actividad_evaluativa')
      .select(`
        *,
        tipo_actividad:tipo_actividad_id(nombre),
        asignatura:asignatura_id(nombre),
        calificacion(id, nota, estudiante_id)
      `)
      .eq('grupo_id', grupoId)
      .eq('periodo_academico_id', periodoId)
      .order('fecha', { ascending: true });

    if (asignaturaId) qb = qb.eq('asignatura_id', asignaturaId);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getActividad(id: string) {
    const { data, error } = await this.supabase.admin
      .from('actividad_evaluativa')
      .select(`
        *,
        tipo_actividad:tipo_actividad_id(nombre),
        asignatura:asignatura_id(nombre),
        grupo:grupo_id(nombre, grado:grado_id(nombre)),
        periodo:periodo_academico_id(nombre, numero)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Actividad evaluativa no encontrada');
    return data;
  }

  async updateActividad(id: string, dto: Partial<CreateActividadDto>) {
    const { data, error } = await this.supabase.admin
      .from('actividad_evaluativa')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Actividad evaluativa no encontrada');
    return { message: 'Actividad actualizada', data };
  }

  async deleteActividad(id: string) {
    // Verificar que no tenga calificaciones registradas
    const { count } = await this.supabase.admin
      .from('calificacion')
      .select('id', { count: 'exact', head: true })
      .eq('actividad_evaluativa_id', id);

    if (count && count > 0) {
      throw new BadRequestException('No se puede eliminar la actividad porque tiene calificaciones registradas');
    }

    const { error } = await this.supabase.admin
      .from('actividad_evaluativa')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Actividad eliminada' };
  }

  async registrarNotas(dto: RegistrarNotasDto) {
    const { data: actividad, error: actErr } = await this.supabase.admin
      .from('actividad_evaluativa')
      .select('id, nombre')
      .eq('id', dto.actividad_evaluativa_id)
      .single();

    if (actErr || !actividad) throw new NotFoundException('Actividad evaluativa no encontrada');

    const registros = dto.calificaciones.map((c) => ({
      estudiante_id: c.estudiante_id,
      actividad_evaluativa_id: dto.actividad_evaluativa_id,
      nota: c.nota,
      observacion: c.observacion || null,
    }));

    const { data, error } = await this.supabase.admin
      .from('calificacion')
      .upsert(registros, {
        onConflict: 'estudiante_id,actividad_evaluativa_id',
      })
      .select();

    if (error) throw new BadRequestException(error.message);

    return {
      message: `${data.length} calificaciones registradas para "${actividad.nombre}"`,
      data,
    };
  }

  async actualizarNota(calificacionId: string, dto: UpdateNotaDto) {
    const { data, error } = await this.supabase.admin
      .from('calificacion')
      .update({ nota: dto.nota, observacion: dto.observacion })
      .eq('id', calificacionId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Calificación no encontrada');
    return { message: 'Nota actualizada', data };
  }

  async getNotasEstudiante(estudianteId: string, periodoId?: string) {
    let qb = this.supabase.admin
      .from('calificacion')
      .select(`
        id, nota, observacion,
        actividad_evaluativa:actividad_evaluativa_id(
          nombre, porcentaje_peso, fecha,
          tipo_actividad:tipo_actividad_id(nombre),
          asignatura:asignatura_id(nombre, area:area_id(nombre)),
          periodo:periodo_academico_id(nombre, numero)
        )
      `)
      .eq('estudiante_id', estudianteId);
      // .order('created_at', { ascending: false });

    if (periodoId) {
      qb = qb.eq('actividad_evaluativa.periodo_academico_id', periodoId);
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getBoletin(estudianteId: string, anioLectivoId?: string) {
    const qb = this.supabase.admin
      .from('nota_periodo')
      .select(`
        id, nota_final, desempeno, observacion_docente,
        asignatura:asignatura_id(nombre, area:area_id(nombre)),
        periodo:periodo_academico_id(nombre, numero, anio_lectivo:anio_lectivo_id(anio))
      `)
      .eq('estudiante_id', estudianteId)
      .order('periodo_academico_id');

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);

    const boletin = {};
    for (const nota of data || []) {
      const periodoNombre = (nota as any).periodo?.nombre || 'Sin periodo';
      if (!boletin[periodoNombre]) {
        boletin[periodoNombre] = {
          periodo: (nota as any).periodo,
          asignaturas: [],
        };
      }
      boletin[periodoNombre].asignaturas.push({
        asignatura: (nota as any).asignatura,
        nota_final: nota.nota_final,
        desempeno: nota.desempeno,
        observacion: nota.observacion_docente,
      });
    }

    return {
      estudiante_id: estudianteId,
      periodos: Object.values(boletin),
    };
  }

  async getPlanilla(grupoId: string, asignaturaId: string, periodoId: string) {
    const { data: matriculas } = await this.supabase.admin
      .from('matricula')
      .select('estudiante:estudiante_id(id, primer_nombre, primer_apellido, numero_documento)')
      .eq('grupo_id', grupoId)
      .eq('estado', 'Activa');

    const { data: actividades } = await this.supabase.admin
      .from('actividad_evaluativa')
      .select('id, nombre, porcentaje_peso, tipo_actividad:tipo_actividad_id(nombre)')
      .eq('grupo_id', grupoId)
      .eq('asignatura_id', asignaturaId)
      .eq('periodo_academico_id', periodoId);

    const actividadIds = (actividades || []).map((a) => a.id);
    const { data: calificaciones } = await this.supabase.admin
      .from('calificacion')
      .select('id, nota, observacion, estudiante_id, actividad_evaluativa_id')
      .in('actividad_evaluativa_id', actividadIds.length ? actividadIds : ['none']);

    const estudianteIds = (matriculas || []).map((m: any) => m.estudiante.id);
    const { data: notasPeriodo } = await this.supabase.admin
      .from('nota_periodo')
      .select('estudiante_id, nota_final, desempeno')
      .in('estudiante_id', estudianteIds.length ? estudianteIds : ['none'])
      .eq('asignatura_id', asignaturaId)
      .eq('periodo_academico_id', periodoId);

    const planilla = (matriculas || []).map((m: any) => {
      const est = m.estudiante;
      const notasEst = (calificaciones || []).filter((c) => c.estudiante_id === est.id);
      const notaPeriodo = (notasPeriodo || []).find((n) => n.estudiante_id === est.id);

      return {
        estudiante: est,
        notas: (actividades || []).map((act) => {
          const cal = notasEst.find((c) => c.actividad_evaluativa_id === act.id);
          return {
            actividad_id: act.id,
            actividad_nombre: act.nombre,
            nota: cal?.nota ?? null,
            calificacion_id: cal?.id ?? null,
          };
        }),
        nota_final: notaPeriodo?.nota_final ?? null,
        desempeno: notaPeriodo?.desempeno ?? null,
      };
    });

    return { actividades, planilla };
  }

  async getTiposActividad() {
    const { data, error } = await this.supabase.admin
      .from('tipo_actividad')
      .select('*')
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
