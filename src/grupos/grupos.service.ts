import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGrupoDto } from './dto/grupo.dto';

@Injectable()
export class GruposService {
  constructor(private supabase: SupabaseService) {}

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('grupo')
      .select(`
        *,
        grado:grado_id(nombre, orden, nivel:nivel_id(nombre)),
        anio_lectivo:anio_lectivo_id(anio, activo),
        sede:sede_id(nombre)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Grupo no encontrado');
    return data;
  }

  async update(id: string, dto: Partial<CreateGrupoDto>) {
    const { data, error } = await this.supabase.admin
      .from('grupo')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Grupo actualizado', data };
  }

  async remove(id: string) {
    // Verificar si tiene matrículas activas
    const { data: matriculas } = await this.supabase.admin
      .from('matricula')
      .select('id')
      .eq('grupo_id', id)
      .eq('estado', 'Activa');

    if (matriculas && matriculas.length > 0) {
      throw new BadRequestException('No se puede eliminar un grupo con matrículas activas');
    }

    const { error } = await this.supabase.admin
      .from('grupo')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Grupo eliminado' };
  }

  async create(dto: CreateGrupoDto) {
    const { data, error } = await this.supabase.admin
      .from('grupo')
      .insert(dto)
      .select(`*, grado:grado_id(nombre, nivel:nivel_id(nombre))`)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Grupo creado', data };
  }

  async findAll(anioLectivoId?: string) {
    let qb = this.supabase.admin
      .from('grupo')
      .select(`
        *,
        grado:grado_id(nombre, orden, nivel:nivel_id(nombre)),
        anio_lectivo:anio_lectivo_id(anio, activo),
        sede:sede_id(nombre)
      `)
      .order('grado_id');

    if (anioLectivoId) qb = qb.eq('anio_lectivo_id', anioLectivoId);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getEstudiantesDelGrupo(grupoId: string) {
    const { data, error } = await this.supabase.admin
      .from('matricula')
      .select(`
        id, estado,
        estudiante:estudiante_id(id, primer_nombre, primer_apellido, numero_documento, genero, foto_perfil_url)
      `)
      .eq('grupo_id', grupoId)
      .eq('estado', 'Activa');

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getGrados() {
    const { data, error } = await this.supabase.admin
      .from('grado')
      .select('id, nombre, nivel_id')
      .order('orden');

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
