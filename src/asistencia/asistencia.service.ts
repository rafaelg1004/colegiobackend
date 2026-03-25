import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegistrarAsistenciaDto, UpdateAsistenciaDto } from './dto/asistencia.dto';

@Injectable()
export class AsistenciaService {
  constructor(private supabase: SupabaseService) {}

  async registrar(dto: RegistrarAsistenciaDto, registradoPor: string) {
    const registros = dto.asistencias.map((a) => ({
      fecha: dto.fecha,
      grupo_id: dto.grupo_id,
      asignatura_id: dto.asignatura_id || null,
      estudiante_id: a.estudiante_id,
      estado: a.estado,
      justificacion: a.justificacion || null,
      registrado_por: registradoPor,
    }));

    const { data, error } = await this.supabase.admin
      .from('asistencia')
      .upsert(registros, {
        onConflict: 'fecha,estudiante_id,grupo_id,asignatura_id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      await this.supabase.admin
        .from('asistencia')
        .delete()
        .eq('fecha', dto.fecha)
        .eq('grupo_id', dto.grupo_id)
        .in('estudiante_id', dto.asistencias.map((a) => a.estudiante_id));

      const { data: data2, error: error2 } = await this.supabase.admin
        .from('asistencia')
        .insert(registros)
        .select();

      if (error2) throw new BadRequestException(error2.message);
      return { message: `Asistencia registrada para ${data2.length} estudiantes`, data: data2 };
    }

    return { message: `Asistencia registrada para ${data.length} estudiantes`, data };
  }

  async getAsistenciaPorFecha(grupoId: string, fecha: string, asignaturaId?: string) {
    let qb = this.supabase.admin
      .from('asistencia')
      .select(`
        id, estado, justificacion,
        estudiante:estudiante_id(id, primer_nombre, primer_apellido, numero_documento, foto_perfil_url)
      `)
      .eq('grupo_id', grupoId)
      .eq('fecha', fecha);

    if (asignaturaId) qb = qb.eq('asignatura_id', asignaturaId);
    else qb = qb.is('asignatura_id', null);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getResumenEstudiante(estudianteId: string, grupoId?: string) {
    let qb = this.supabase.admin
      .from('asistencia')
      .select('estado, fecha')
      .eq('estudiante_id', estudianteId);

    if (grupoId) qb = qb.eq('grupo_id', grupoId);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);

    const resumen = {
      total: data?.length || 0,
      presente: data?.filter((a) => a.estado === 'Presente').length || 0,
      ausente: data?.filter((a) => a.estado === 'Ausente').length || 0,
      tardanza: data?.filter((a) => a.estado === 'Tardanza').length || 0,
      excusa: data?.filter((a) => a.estado === 'Excusa').length || 0,
      porcentaje_asistencia: 0,
    };

    resumen.porcentaje_asistencia = resumen.total > 0
      ? Math.round((resumen.presente / resumen.total) * 1000) / 10
      : 0;

    return resumen;
  }

  async getResumenGrupo(grupoId: string, fechaInicio?: string, fechaFin?: string) {
    let qb = this.supabase.admin
      .from('asistencia')
      .select(`
        estado,
        estudiante:estudiante_id(id, primer_nombre, primer_apellido)
      `)
      .eq('grupo_id', grupoId)
      .is('asignatura_id', null);

    if (fechaInicio) qb = qb.gte('fecha', fechaInicio);
    if (fechaFin) qb = qb.lte('fecha', fechaFin);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);

    const porEstudiante = {};
    for (const reg of data || []) {
      const est = (reg as any).estudiante;
      const key = est.id;
      if (!porEstudiante[key]) {
        porEstudiante[key] = {
          estudiante: est,
          presente: 0, ausente: 0, tardanza: 0, excusa: 0, total: 0,
        };
      }
      porEstudiante[key][reg.estado.toLowerCase()]++;
      porEstudiante[key].total++;
    }

    return Object.values(porEstudiante).map((e: any) => ({
      ...e,
      porcentaje: e.total > 0 ? Math.round((e.presente / e.total) * 1000) / 10 : 0,
    }));
  }

  async update(id: string, dto: UpdateAsistenciaDto) {
    const { data, error } = await this.supabase.admin
      .from('asistencia')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Asistencia actualizada', data };
  }
}
