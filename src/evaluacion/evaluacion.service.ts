import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateActividadEvaluativaDto, UpdateActividadEvaluativaDto,
  CreateBloqueHorarioDto, UpdateBloqueHorarioDto,
  CreateNotaPeriodoDto, UpdateNotaPeriodoDto
} from './dto/evaluacion.dto';

@Injectable()
export class EvaluacionService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // ACTIVIDADES EVALUATIVAS
  // ======================

  async getActividades(filtros: { grupo_id?: string; asignatura_id?: string; periodo_id?: string }) {
    let qb = this.supabase.admin
      .from('actividad_evaluativa')
      .select(`
        *,
        tipo_actividad:tipo_actividad_id(nombre),
        asignatura:asignatura_id(nombre, area:area_id(nombre)),
        grupo:grupo_id(nombre),
        periodo:periodo_academico_id(nombre, numero)
      `)
      .order('fecha', { ascending: false });

    if (filtros.grupo_id) qb = qb.eq('grupo_id', filtros.grupo_id);
    if (filtros.asignatura_id) qb = qb.eq('asignatura_id', filtros.asignatura_id);
    if (filtros.periodo_id) qb = qb.eq('periodo_academico_id', filtros.periodo_id);

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
        asignatura:asignatura_id(nombre, area:area_id(nombre)),
        grupo:grupo_id(nombre),
        periodo:periodo_academico_id(nombre, numero)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Actividad evaluativa no encontrada');
    return data;
  }

  async crearActividad(dto: CreateActividadEvaluativaDto) {
    const { data, error } = await this.supabase.admin
      .from('actividad_evaluativa')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Actividad evaluativa creada', data };
  }

  async updateActividad(id: string, dto: UpdateActividadEvaluativaDto) {
    const { data, error } = await this.supabase.admin
      .from('actividad_evaluativa')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Actividad evaluativa no encontrada');
    return { message: 'Actividad evaluativa actualizada', data };
  }

  async deleteActividad(id: string) {
    // Verificar si hay calificaciones asociadas
    const { data: calificaciones } = await this.supabase.admin
      .from('calificacion')
      .select('id')
      .eq('actividad_evaluativa_id', id)
      .limit(1);

    if (calificaciones && calificaciones.length > 0) {
      throw new BadRequestException('No se puede eliminar una actividad con calificaciones asociadas');
    }

    const { data, error } = await this.supabase.admin
      .from('actividad_evaluativa')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Actividad evaluativa eliminada', data };
  }

  // ======================
  // BLOQUES HORARIOS
  // ======================

  async getBloquesHorarios(filtros: { anio_lectivo_id?: string; dia_semana?: string; grupo_id?: string }) {
    let qb = this.supabase.admin
      .from('bloque_horario')
      .select(`
        *,
        asignacion:asignacion_docente_id(
          docente:empleado_id(primer_nombre, primer_apellido),
          asignatura:asignatura_id(nombre),
          grupo:grupo_id(nombre)
        ),
        anio:anio_lectivo_id(anio)
      `)
      .order('hora_inicio');

    if (filtros.anio_lectivo_id) qb = qb.eq('anio_lectivo_id', filtros.anio_lectivo_id);
    if (filtros.dia_semana) qb = qb.eq('dia_semana', filtros.dia_semana);
    if (filtros.grupo_id) {
      qb = qb.eq('asignacion.grupo_id', filtros.grupo_id);
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getBloqueHorario(id: string) {
    const { data, error } = await this.supabase.admin
      .from('bloque_horario')
      .select(`
        *,
        asignacion:asignacion_docente_id(
          *,
          docente:empleado_id(primer_nombre, primer_apellido),
          asignatura:asignatura_id(nombre),
          grupo:grupo_id(nombre)
        ),
        anio:anio_lectivo_id(anio)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Bloque horario no encontrado');
    return data;
  }

  async crearBloqueHorario(dto: CreateBloqueHorarioDto) {
    const { data, error } = await this.supabase.admin
      .from('bloque_horario')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Bloque horario creado', data };
  }

  async updateBloqueHorario(id: string, dto: UpdateBloqueHorarioDto) {
    const { data, error } = await this.supabase.admin
      .from('bloque_horario')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Bloque horario no encontrado');
    return { message: 'Bloque horario actualizado', data };
  }

  async deleteBloqueHorario(id: string) {
    const { data, error } = await this.supabase.admin
      .from('bloque_horario')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Bloque horario eliminado', data };
  }

  // ======================
  // NOTAS POR PERIODO
  // ======================

  async getNotasPeriodo(filtros: { estudiante_id?: string; asignatura_id?: string; periodo_id?: string }) {
    let qb = this.supabase.admin
      .from('nota_periodo')
      .select(`
        *,
        estudiante:estudiante_id(primer_nombre, primer_apellido, numero_documento),
        asignatura:asignatura_id(nombre, area:area_id(nombre)),
        periodo:periodo_academico_id(nombre, numero)
      `)
      .order('estudiante.apellido');

    if (filtros.estudiante_id) qb = qb.eq('estudiante_id', filtros.estudiante_id);
    if (filtros.asignatura_id) qb = qb.eq('asignatura_id', filtros.asignatura_id);
    if (filtros.periodo_id) qb = qb.eq('periodo_academico_id', filtros.periodo_id);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getNotaPeriodo(id: string) {
    const { data, error } = await this.supabase.admin
      .from('nota_periodo')
      .select(`
        *,
        estudiante:estudiante_id(primer_nombre, primer_apellido, numero_documento),
        asignatura:asignatura_id(nombre, area:area_id(nombre)),
        periodo:periodo_academico_id(nombre, numero)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Nota de periodo no encontrada');
    return data;
  }

  async crearNotaPeriodo(dto: CreateNotaPeriodoDto) {
    // Calcular desempeño automáticamente si hay nota
    let desempeno = dto.desempeno;
    if (dto.nota_final !== undefined && !desempeno) {
      if (dto.nota_final >= 4.6) desempeno = 'Superior';
      else if (dto.nota_final >= 4.0) desempeno = 'Alto';
      else if (dto.nota_final >= 3.0) desempeno = 'Básico';
      else desempeno = 'Bajo';
    }

    const { data, error } = await this.supabase.admin
      .from('nota_periodo')
      .insert({ ...dto, desempeno })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Nota de periodo creada', data };
  }

  async updateNotaPeriodo(id: string, dto: UpdateNotaPeriodoDto) {
    // Calcular desempeño automáticamente si se proporciona nota
    let desempeno = dto.desempeno;
    if (dto.nota_final !== undefined && !desempeno) {
      if (dto.nota_final >= 4.6) desempeno = 'Superior';
      else if (dto.nota_final >= 4.0) desempeno = 'Alto';
      else if (dto.nota_final >= 3.0) desempeno = 'Básico';
      else desempeno = 'Bajo';
    }

    const { data, error } = await this.supabase.admin
      .from('nota_periodo')
      .update({ ...dto, desempeno })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Nota de periodo no encontrada');
    return { message: 'Nota de periodo actualizada', data };
  }

  async deleteNotaPeriodo(id: string) {
    const { data, error } = await this.supabase.admin
      .from('nota_periodo')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Nota de periodo eliminada', data };
  }
}