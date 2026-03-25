import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateEstudianteDto, UpdateEstudianteDto, QueryEstudianteDto } from './dto/estudiante.dto';

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
      throw new ConflictException('Ya existe un estudiante con ese número de documento');
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
    const to = from + limit - 1;

    let qb = this.supabase.admin
      .from('estudiante')
      .select('*, matricula(id, grupo:grupo_id(nombre, grado:grado_id(nombre, nivel:nivel_id(nombre))), anio_lectivo:anio_lectivo_id(anio, activo))', { count: 'exact' })
      .order('primer_apellido', { ascending: true })
      .range(from, to);

    if (query.estado) {
      qb = qb.eq('estado', query.estado);
    }

    if (query.buscar) {
      qb = qb.or(
        `primer_nombre.ilike.%${query.buscar}%,primer_apellido.ilike.%${query.buscar}%,numero_documento.ilike.%${query.buscar}%`,
      );
    }

    const { data, error, count } = await qb;
    if (error) throw new BadRequestException(error.message);

    return {
      data,
      meta: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('estudiante')
      .select(`
        *,
        matricula(
          id, estado, fecha_matricula,
          grupo:grupo_id(nombre, jornada, grado:grado_id(nombre, nivel:nivel_id(nombre))),
          anio_lectivo:anio_lectivo_id(anio, activo)
        ),
        estudiante_acudiente(
          es_principal,
          acudiente:acudiente_id(id, primer_nombre, primer_apellido, celular, correo_electronico, parentesco)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Estudiante no encontrado');
    return data;
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

  async vincularAcudiente(estudianteId: string, acudienteId: string, esPrincipal = false) {
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
        throw new ConflictException('Este acudiente ya está vinculado al estudiante');
      }
      throw new BadRequestException(error.message);
    }
    return { message: 'Acudiente vinculado exitosamente', data };
  }
}
