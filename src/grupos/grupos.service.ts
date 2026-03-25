import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGrupoDto } from './dto/grupo.dto';

@Injectable()
export class GruposService {
  constructor(private supabase: SupabaseService) {}

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
