import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
    const query = this.supabase.admin.query;

    let sql = `
      SELECT 
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'es_principal', ea.es_principal,
              'estudiante', json_build_object(
                'id', e.id,
                'primer_nombre', e.primer_nombre,
                'primer_apellido', e.primer_apellido,
                'numero_documento', e.numero_documento
              )
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) as estudiante_acudiente
      FROM acudiente a
      LEFT JOIN estudiante_acudiente ea ON a.id = ea.acudiente_id
      LEFT JOIN estudiante e ON ea.estudiante_id = e.id
    `;

    const params: any[] = [];
    if (buscar) {
      sql += ` WHERE a.primer_nombre ILIKE $1 OR a.primer_apellido ILIKE $1 OR a.numero_documento ILIKE $1`;
      params.push(`%${buscar}%`);
    }

    sql += ` GROUP BY a.id ORDER BY a.primer_apellido`;

    const { data, error } = await query(sql, params);
    if (error) {
      console.error('❌ SQL Error en acudientes findAll:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async findOne(id: string) {
    const query = this.supabase.admin.query;

    const sql = `
      SELECT 
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'es_principal', ea.es_principal,
              'estudiante', json_build_object(
                'id', e.id,
                'primer_nombre', e.primer_nombre,
                'primer_apellido', e.primer_apellido,
                'numero_documento', e.numero_documento,
                'estado', e.estado
              )
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) as estudiante_acudiente
      FROM acudiente a
      LEFT JOIN estudiante_acudiente ea ON a.id = ea.acudiente_id
      LEFT JOIN estudiante e ON ea.estudiante_id = e.id
      WHERE a.id = $1
      GROUP BY a.id
    `;

    const { data, error } = await query(sql, [id]);
    if (error) throw new BadRequestException(error.message);
    if (!data || data.length === 0)
      throw new NotFoundException('Acudiente no encontrado');
    return data[0];
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
