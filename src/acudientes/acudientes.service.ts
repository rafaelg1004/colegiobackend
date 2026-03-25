import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAcudienteDto, UpdateAcudienteDto } from './dto/acudiente.dto';

@Injectable()
export class AcudientesService {
  constructor(private supabase: SupabaseService) {}

  async create(dto: CreateAcudienteDto) {
    const { data: existe } = await this.supabase.admin
      .from('acudiente')
      .select('id')
      .eq('numero_documento', dto.numero_documento)
      .single();

    if (existe) {
      throw new ConflictException('Ya existe un acudiente con ese documento');
    }

    const { data, error } = await this.supabase.admin
      .from('acudiente')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Acudiente creado exitosamente', data };
  }

  async findAll(buscar?: string) {
    let qb = this.supabase.admin
      .from('acudiente')
      .select(`
        *,
        estudiante_acudiente(
          es_principal,
          estudiante:estudiante_id(id, primer_nombre, primer_apellido, numero_documento)
        )
      `)
      .order('primer_apellido');

    if (buscar) {
      qb = qb.or(
        `primer_nombre.ilike.%${buscar}%,primer_apellido.ilike.%${buscar}%,numero_documento.ilike.%${buscar}%`,
      );
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('acudiente')
      .select(`
        *,
        estudiante_acudiente(
          es_principal,
          estudiante:estudiante_id(id, primer_nombre, primer_apellido, numero_documento, estado)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Acudiente no encontrado');
    return data;
  }

  async update(id: string, dto: UpdateAcudienteDto) {
    const { data, error } = await this.supabase.admin
      .from('acudiente')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Acudiente no encontrado');
    return { message: 'Acudiente actualizado', data };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('acudiente')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Acudiente eliminado' };
  }
}
