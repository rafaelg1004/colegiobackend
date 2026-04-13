import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateMatriculaDto, UpdateMatriculaDto } from './dto/matricula.dto';

@Injectable()
export class MatriculasService {
  constructor(private supabase: SupabaseService) {}

  async create(dto: CreateMatriculaDto) {
    const { data: existe } = await this.supabase.admin
      .from('matricula')
      .select('id')
      .eq('estudiante_id', dto.estudiante_id)
      .eq('anio_lectivo_id', dto.anio_lectivo_id)
      .single();

    if (existe) {
      throw new ConflictException(
        'El estudiante ya tiene matrícula para este año lectivo',
      );
    }

    const { data: grupo } = await this.supabase.admin
      .from('grupo')
      .select('cupo_maximo')
      .eq('id', dto.grupo_id)
      .single();

    const { count } = await this.supabase.admin
      .from('matricula')
      .select('id', { count: 'exact', head: true })
      .eq('grupo_id', dto.grupo_id)
      .eq('estado', 'Activa');

    if (grupo && (count ?? 0) >= grupo.cupo_maximo) {
      throw new BadRequestException('El grupo ya alcanzó el cupo máximo');
    }

    const query = this.supabase.admin.query;

    // Insertar matrícula
    const insertQuery = `
      INSERT INTO matricula (
        estudiante_id, grupo_id, anio_lectivo_id, fecha_matricula, estado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const insertParams = [
      dto.estudiante_id,
      dto.grupo_id,
      dto.anio_lectivo_id,
      new Date().toISOString(), // fecha_matricula por defecto
      'Activa', // estado por defecto
      dto.observaciones || null,
    ];

    const { data: newMatricula, error: insertError } = await query(
      insertQuery,
      insertParams,
    );
    if (insertError) throw new BadRequestException(insertError.message);

    // Obtener datos relacionados
    const matriculaId = newMatricula?.[0]?.id;
    const { data: fullData, error: selectError } = await query(
      `
      SELECT 
        m.*,
        json_build_object(
          'id', e.id,
          'primer_nombre', e.primer_nombre,
          'primer_apellido', e.primer_apellido,
          'numero_documento', e.numero_documento
        ) as estudiante,
        json_build_object(
          'id', g.id,
          'nombre', g.nombre,
          'grado', json_build_object('nombre', gr.nombre)
        ) as grupo,
        json_build_object('id', al.id, 'anio', al.anio) as anio_lectivo
      FROM matricula m
      LEFT JOIN estudiante e ON m.estudiante_id = e.id
      LEFT JOIN grupo g ON m.grupo_id = g.id
      LEFT JOIN grado gr ON g.grado_id = gr.id
      LEFT JOIN anio_lectivo al ON m.anio_lectivo_id = al.id
      WHERE m.id = $1
    `,
      [matriculaId],
    );

    if (selectError) throw new BadRequestException(selectError.message);
    return { message: 'Matrícula creada exitosamente', data: fullData?.[0] };
  }

  async findAll(anioLectivoId?: string, grupoId?: string) {
    const query = this.supabase.admin.query;

    // Si no se pasa año lectivo, obtener el activo
    let anioId = anioLectivoId;
    if (!anioId) {
      const { data: anioActivo } = await query(
        'SELECT id FROM anio_lectivo WHERE activo = true LIMIT 1',
      );
      anioId = anioActivo?.[0]?.id;
    }

    let sql = `
      SELECT 
        m.*,
        json_build_object(
          'id', e.id,
          'primer_nombre', e.primer_nombre,
          'primer_apellido', e.primer_apellido,
          'numero_documento', e.numero_documento
        ) as estudiante,
        json_build_object(
          'id', g.id,
          'nombre', g.nombre,
          'grado', json_build_object('nombre', gr.nombre)
        ) as grupo,
        json_build_object(
          'id', al.id,
          'anio', al.anio,
          'activo', al.activo
        ) as anio_lectivo
      FROM matricula m
      LEFT JOIN estudiante e ON m.estudiante_id = e.id
      LEFT JOIN grupo g ON m.grupo_id = g.id
      LEFT JOIN grado gr ON g.grado_id = gr.id
      LEFT JOIN anio_lectivo al ON m.anio_lectivo_id = al.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (anioId) {
      conditions.push(`m.anio_lectivo_id = $${params.length + 1}`);
      params.push(anioId);
    }
    if (grupoId) {
      conditions.push(`m.grupo_id = $${params.length + 1}`);
      params.push(grupoId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY m.fecha_matricula DESC`;

    const { data, error } = await query(sql, params);
    if (error) {
      console.error('❌ Error en findAll matriculas:', error);
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async update(id: string, dto: UpdateMatriculaDto) {
    if (dto.grupo_id) {
      const { data: grupo } = await this.supabase.admin
        .from('grupo')
        .select('cupo_maximo')
        .eq('id', dto.grupo_id)
        .single();

      const { count } = await this.supabase.admin
        .from('matricula')
        .select('id', { count: 'exact', head: true })
        .eq('grupo_id', dto.grupo_id)
        .eq('estado', 'Activa');

      if (grupo && (count ?? 0) >= grupo.cupo_maximo) {
        throw new BadRequestException(
          'El grupo destino ya alcanzó el cupo máximo',
        );
      }
    }

    const { data, error } = await this.supabase.admin
      .from('matricula')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Matrícula no encontrada');
    return { message: 'Matrícula actualizada', data };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('matricula')
      .select(
        `
        *,
        estudiante:estudiante_id(*),
        grupo:grupo_id(*, grado:grado_id(nombre, nivel:nivel_id(nombre))),
        anio_lectivo:anio_lectivo_id(anio, activo)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Matrícula no encontrada');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('matricula')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Matrícula eliminada' };
  }

  async matriculaMasiva(
    estudianteIds: string[],
    grupoId: string,
    anioLectivoId: string,
  ) {
    const registros = estudianteIds.map((eid) => ({
      estudiante_id: eid,
      grupo_id: grupoId,
      anio_lectivo_id: anioLectivoId,
    }));

    const { data, error } = await this.supabase.admin
      .from('matricula')
      .insert(registros)
      .select();

    if (error) throw new BadRequestException(error.message);
    return { message: `${data.length} estudiantes matriculados`, data };
  }
}
