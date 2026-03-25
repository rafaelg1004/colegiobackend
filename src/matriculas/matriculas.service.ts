import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
      throw new ConflictException('El estudiante ya tiene matrícula para este año lectivo');
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

    const { data, error } = await this.supabase.admin
      .from('matricula')
      .insert(dto)
      .select(`
        *,
        estudiante:estudiante_id(primer_nombre, primer_apellido, numero_documento),
        grupo:grupo_id(nombre, grado:grado_id(nombre)),
        anio_lectivo:anio_lectivo_id(anio)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Matrícula creada exitosamente', data };
  }

  async findAll(anioLectivoId?: string, grupoId?: string) {
    // Si no se pasa año lectivo, obtener el activo
    let anioId = anioLectivoId;
    if (!anioId) {
      const { data: anioActivo } = await this.supabase.admin
        .from('anio_lectivo')
        .select('id')
        .eq('activo', true)
        .single();
      anioId = anioActivo?.id;
    }

    let qb = this.supabase.admin
      .from('matricula')
      .select(`
        *,
        estudiante:estudiante_id(id, primer_nombre, primer_apellido, numero_documento),
        grupo:grupo_id(id, nombre, grado:grado_id(nombre)),
        anio_lectivo:anio_lectivo_id(id, anio, activo)
      `)
      .order('fecha_matricula', { ascending: false });


    if (anioId) qb = qb.eq('anio_lectivo_id', anioId);
    if (grupoId) qb = qb.eq('grupo_id', grupoId);

    const { data, error } = await qb;
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
        throw new BadRequestException('El grupo destino ya alcanzó el cupo máximo');
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

  async matriculaMasiva(estudianteIds: string[], grupoId: string, anioLectivoId: string) {
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
