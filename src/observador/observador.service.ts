import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateObservacionDto, UpdateObservacionDto } from './dto/observador.dto';

@Injectable()
export class ObservadorService {
  constructor(private supabase: SupabaseService) {}

  async crearObservacion(dto: CreateObservacionDto, empleadoId: string) {
    const { data, error } = await this.supabase.admin
      .from('observacion')
      .insert({
        ...dto,
        registrado_por: empleadoId,
        fecha: dto.fecha || new Date().toISOString().split('T')[0],
      })
      .select(`
        *,
        registrado_por_empleado:registrado_por(primer_nombre, primer_apellido, cargo)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Observacion registrada', data };
  }

  async getObservacionesEstudiante(estudianteId: string) {
    const { data, error } = await this.supabase.admin
      .from('observacion')
      .select(`
        *,
        registrado_por_empleado:registrado_por(primer_nombre, primer_apellido, cargo)
      `)
      .eq('estudiante_id', estudianteId)
      .order('fecha', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updateObservacion(id: string, dto: UpdateObservacionDto) {
    const { data, error } = await this.supabase.admin
      .from('observacion')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Observacion no encontrada');
    return { message: 'Observacion actualizada', data };
  }

  async getResumenEstudiante(estudianteId: string) {
    const { data: observaciones } = await this.supabase.admin
      .from('observacion')
      .select('tipo')
      .eq('estudiante_id', estudianteId);

    return {
      total: observaciones?.length || 0,
      positivas: observaciones?.filter(o => o.tipo === 'Positiva').length || 0,
      negativas: observaciones?.filter(o => o.tipo === 'Negativa').length || 0,
      informativas: observaciones?.filter(o => o.tipo === 'Informativa').length || 0,
      compromisos: observaciones?.filter(o => o.tipo === 'Compromiso').length || 0,
    };
  }

  async firmarObservacion(id: string) {
    const { data, error } = await this.supabase.admin
      .from('observacion')
      .update({ firma_acudiente: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Observacion firmada por acudiente', data };
  }
}
