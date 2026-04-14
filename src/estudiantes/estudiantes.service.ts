import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateEstudianteDto,
  UpdateEstudianteDto,
  QueryEstudianteDto,
} from './dto/estudiante.dto';

@Injectable()
export class EstudiantesService {
  constructor(private supabase: SupabaseService) {}

  async create(dto: CreateEstudianteDto) {
    const { data: existe } = await this.supabase.admin
      .from('estudiante')
      .select('id')
      .eq('numero_documento', dto.numero_documento)
      .single();

    if (existe) {
      throw new ConflictException(
        'Ya existe un estudiante con ese número de documento',
      );
    }

    const { data, error } = await this.supabase.admin
      .from('estudiante')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Estudiante creado exitosamente', data };
  }

  async findAll(query: QueryEstudianteDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const from = (page - 1) * limit;
    const dbQuery = this.supabase.admin.query;

    // Contar total
    let countSql = 'SELECT COUNT(*) as count FROM estudiante e';
    const countParams: any[] = [];

    // Si no se especifica estado, excluir Inactivos por defecto
    if (query.estado) {
      countSql += ' WHERE e.estado = $1';
      countParams.push(query.estado);
    } else {
      countSql += " WHERE e.estado != 'Inactivo'";
    }

    if (query.buscar) {
      countSql += ' AND';
      countSql += ` (e.primer_nombre ILIKE $${countParams.length + 1} OR e.primer_apellido ILIKE $${countParams.length + 1} OR e.numero_documento ILIKE $${countParams.length + 1})`;
      countParams.push(`%${query.buscar}%`);
    }

    const { data: countResult } = await dbQuery(countSql, countParams);
    const count = parseInt(countResult?.[0]?.count || '0');

    // Obtener datos con matrícula
    let sql = `
      SELECT 
        e.*,
        (
          SELECT json_build_object(
            'id', m2.id,
            'estado', m2.estado,
            'fecha_matricula', m2.fecha_matricula,
            'grupo', json_build_object(
              'nombre', g2.nombre,
              'jornada', g2.jornada,
              'grado', json_build_object(
                'nombre', gr2.nombre,
                'nivel', json_build_object('nombre', n2.nombre)
              )
            ),
            'anio_lectivo', json_build_object('anio', al2.anio, 'activo', al2.activo)
          )
          FROM matricula m2
          LEFT JOIN grupo g2 ON m2.grupo_id = g2.id
          LEFT JOIN grado gr2 ON g2.grado_id = gr2.id
          LEFT JOIN nivel n2 ON gr2.nivel_id = n2.id
          LEFT JOIN anio_lectivo al2 ON m2.anio_lectivo_id = al2.id
          WHERE m2.estudiante_id = e.id
          ORDER BY m2.fecha_matricula DESC
          LIMIT 1
        ) as matricula
      FROM estudiante e
    `;

    const params: any[] = [];

    // Si no se especifica estado, excluir Inactivos por defecto
    if (query.estado) {
      sql += ' WHERE e.estado = $1';
      params.push(query.estado);
    } else {
      sql += " WHERE e.estado != 'Inactivo'";
    }

    if (query.buscar) {
      sql += ' AND';
      sql += ` (e.primer_nombre ILIKE $${params.length + 1} OR e.primer_apellido ILIKE $${params.length + 1} OR e.numero_documento ILIKE $${params.length + 1})`;
      params.push(`%${query.buscar}%`);
    }

    sql += ' ORDER BY e.primer_apellido ASC';
    sql += ` LIMIT ${limit} OFFSET ${from}`;

    const { data, error } = await dbQuery(sql, params);
    if (error) throw new BadRequestException(error.message);

    return {
      data: data || [],
      meta: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findOne(id: string) {
    const query = this.supabase.admin.query;

    const sql = `
      SELECT 
        e.*,
        (
          SELECT json_build_object(
            'id', m2.id,
            'estado', m2.estado,
            'fecha_matricula', m2.fecha_matricula,
            'grupo', json_build_object(
              'nombre', g2.nombre,
              'jornada', g2.jornada,
              'grado', json_build_object(
                'nombre', gr2.nombre,
                'nivel', json_build_object('nombre', n2.nombre)
              )
            ),
            'anio_lectivo', json_build_object('anio', al2.anio, 'activo', al2.activo)
          )
          FROM matricula m2
          LEFT JOIN grupo g2 ON m2.grupo_id = g2.id
          LEFT JOIN grado gr2 ON g2.grado_id = gr2.id
          LEFT JOIN nivel n2 ON gr2.nivel_id = n2.id
          LEFT JOIN anio_lectivo al2 ON m2.anio_lectivo_id = al2.id
          WHERE m2.estudiante_id = e.id
          ORDER BY m2.fecha_matricula DESC
          LIMIT 1
        ) as matricula,
        COALESCE(
          json_agg(
            json_build_object(
              'es_principal', eac.es_principal,
              'acudiente', json_build_object(
                'id', ac.id,
                'primer_nombre', ac.primer_nombre,
                'primer_apellido', ac.primer_apellido,
                'celular', ac.celular,
                'correo_electronico', ac.correo_electronico,
                'parentesco', ac.parentesco
              )
            )
          ) FILTER (WHERE ac.id IS NOT NULL),
          '[]'
        ) as estudiante_acudiente
      FROM estudiante e
      LEFT JOIN estudiante_acudiente eac ON e.id = eac.estudiante_id
      LEFT JOIN acudiente ac ON eac.acudiente_id = ac.id
      WHERE e.id = $1
      GROUP BY e.id
    `;

    const { data, error } = await query(sql, [id]);
    if (error) throw new BadRequestException(error.message);
    if (!data || data.length === 0)
      throw new NotFoundException('Estudiante no encontrado');

    // Convertir matricula de array a objeto si es necesario
    if (Array.isArray(data[0].matricula) && data[0].matricula.length > 0) {
      data[0].matricula = data[0].matricula[0];
    } else if (
      Array.isArray(data[0].matricula) &&
      data[0].matricula.length === 0
    ) {
      data[0].matricula = null;
    }

    return data[0];
  }

  async update(id: string, dto: UpdateEstudianteDto) {
    const { data, error } = await this.supabase.admin
      .from('estudiante')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Estudiante no encontrado');
    return { message: 'Estudiante actualizado', data };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('estudiante')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Estudiante eliminado' };
  }

  async vincularAcudiente(
    estudianteId: string,
    acudienteId: string,
    esPrincipal = false,
  ) {
    const { data, error } = await this.supabase.admin
      .from('estudiante_acudiente')
      .insert({
        estudiante_id: estudianteId,
        acudiente_id: acudienteId,
        es_principal: esPrincipal,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate')) {
        throw new ConflictException(
          'Este acudiente ya está vinculado al estudiante',
        );
      }
      throw new BadRequestException(error.message);
    }
    return { message: 'Acudiente vinculado exitosamente', data };
  }
}
