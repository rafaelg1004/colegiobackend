import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGrupoDto } from './dto/grupo.dto';

@Injectable()
export class GruposService {
  constructor(private supabase: SupabaseService) {}

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('grupo')
      .select(
        `
        *,
        grado:grado_id(nombre, orden, nivel:nivel_id(nombre)),
        anio_lectivo:anio_lectivo_id(anio, activo),
        sede:sede_id(nombre)
      `,
      )
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
      throw new BadRequestException(
        'No se puede eliminar un grupo con matrículas activas',
      );
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
    const query = this.supabase.admin.query;

    let sql = `
      SELECT 
        g.*,
        json_build_object('nombre', gr.nombre, 'orden', gr.orden, 'nivel', json_build_object('nombre', n.nombre)) as grado,
        json_build_object('anio', al.anio, 'activo', al.activo) as anio_lectivo,
        json_build_object('nombre', s.nombre) as sede
      FROM grupo g
      LEFT JOIN grado gr ON g.grado_id = gr.id
      LEFT JOIN nivel n ON gr.nivel_id = n.id
      LEFT JOIN anio_lectivo al ON g.anio_lectivo_id = al.id
      LEFT JOIN sede s ON g.sede_id = s.id
    `;

    const params: any[] = [];
    if (anioLectivoId) {
      sql += ` WHERE g.anio_lectivo_id = $1`;
      params.push(anioLectivoId);
    }

    sql += ` ORDER BY g.grado_id`;

    const { data, error } = await query(sql, params);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getEstudiantesDelGrupo(grupoId: string) {
    const { data, error } = await this.supabase.admin
      .from('matricula')
      .select('*')
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
