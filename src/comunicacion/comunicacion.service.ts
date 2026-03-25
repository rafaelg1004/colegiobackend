import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCircularDto } from './dto/comunicacion.dto';

@Injectable()
export class ComunicacionService {
  constructor(private supabase: SupabaseService) {}

  async updateCircular(id: string, dto: Partial<CreateCircularDto>) {
    const { data, error } = await this.supabase.admin
      .from('circular')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Circular actualizada', data };
  }

  async deleteCircular(id: string) {
    const { error } = await this.supabase.admin
      .from('circular')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Circular eliminada' };
  }

  async crearCircular(dto: CreateCircularDto, empleadoId: string) {
    const { data, error } = await this.supabase.admin
      .from('circular')
      .insert({
        ...dto,
        publicado_por: empleadoId,
        fecha_publicacion: new Date().toISOString(),
      })
      .select(`
        *,
        publicado_por_empleado:publicado_por(primer_nombre, primer_apellido, cargo),
        grupo:grupo_id(nombre, grado:grado_id(nombre))
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Circular publicada exitosamente', data };
  }

  async getCirculares(dirigida_a?: string) {
    let qb = this.supabase.admin
      .from('circular')
      .select(`
        *,
        publicado_por_empleado:publicado_por(primer_nombre, primer_apellido, cargo),
        grupo:grupo_id(nombre, grado:grado_id(nombre))
      `)
      .order('fecha_publicacion', { ascending: false });

    if (dirigida_a) {
      qb = qb.eq('dirigida_a', dirigida_a);
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getCircular(id: string) {
    const { data, error } = await this.supabase.admin
      .from('circular')
      .select(`
        *,
        publicado_por_empleado:publicado_por(primer_nombre, primer_apellido, cargo),
        grupo:grupo_id(nombre, grado:grado_id(nombre))
      `)
      .eq('id', id)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
