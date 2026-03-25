import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateEmpleadoDto, UpdateEmpleadoDto } from './dto/empleado.dto';

@Injectable()
export class EmpleadosService {
  constructor(private supabase: SupabaseService) {}

  async create(dto: CreateEmpleadoDto) {
    const { data, error } = await this.supabase.admin
      .from('empleado')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Empleado creado exitosamente', data };
  }

  async findAll(buscar?: string, cargo?: string) {
    let qb = this.supabase.admin
      .from('empleado')
      .select('*')
      .order('primer_apellido');

    if (buscar) {
      qb = qb.or(`primer_nombre.ilike.%${buscar}%,primer_apellido.ilike.%${buscar}%,numero_documento.ilike.%${buscar}%`);
    }

    if (cargo) {
      qb = qb.eq('cargo', cargo);
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('empleado')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Empleado no encontrado');
    return data;
  }

  async update(id: string, dto: UpdateEmpleadoDto) {
    const { data, error } = await this.supabase.admin
      .from('empleado')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Empleado no encontrado');
    return { message: 'Empleado actualizado', data };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('empleado')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Empleado eliminado' };
  }

  async getDocentes() {
    const { data, error } = await this.supabase.admin
      .from('empleado')
      .select('id, primer_nombre, primer_apellido, cargo')
      .in('cargo', ['Docente', 'Coordinador', 'Rector'])
      .eq('estado', 'Activo')
      .order('primer_apellido');

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }
}
