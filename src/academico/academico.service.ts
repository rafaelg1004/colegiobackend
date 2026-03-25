import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { 
  CreateSedeDto, CreateAnioLectivoDto, CreatePeriodoDto, 
  CreateAreaDto, CreateAsignaturaDto, CreateAsignacionDocenteDto 
} from './dto/academico.dto';

@Injectable()
export class AcademicoService {
  constructor(private supabase: SupabaseService) {}

  // --- SEDES ---
  async crearSede(dto: CreateSedeDto) {
    const { data, error } = await this.supabase.admin.from('sede').insert(dto).select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getSedes() {
    const { data, error } = await this.supabase.admin.from('sede').select('*').order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- AÑO LECTIVO ---
  async crearAnioLectivo(dto: CreateAnioLectivoDto) {
    const { data, error } = await this.supabase.admin.from('anio_lectivo').insert(dto).select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getAniosLectivos() {
    const { data, error } = await this.supabase.admin.from('anio_lectivo').select('*').order('anio', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- PERIODOS ---
  async crearPeriodo(dto: CreatePeriodoDto) {
    const { data, error } = await this.supabase.admin.from('periodo_academico').insert(dto).select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getPeriodos(anioLectivoId: string) {
    const { data, error } = await this.supabase.admin
      .from('periodo_academico')
      .select('*')
      .eq('anio_lectivo_id', anioLectivoId)
      .order('numero');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- ÁREAS Y ASIGNATURAS ---
  async crearArea(dto: CreateAreaDto) {
    const { data, error } = await this.supabase.admin.from('area').insert(dto).select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getAreas() {
    const { data, error } = await this.supabase.admin.from('area').select('*, asignatura(*)').order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async crearAsignatura(dto: CreateAsignaturaDto) {
    const { data, error } = await this.supabase.admin.from('asignatura').insert(dto).select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- CARGA ACADÉMICA (ASIGNACIONES) ---
  async asignarDocente(dto: CreateAsignacionDocenteDto) {
    const { data, error } = await this.supabase.admin
      .from('asignacion_docente')
      .upsert(dto, { onConflict: 'empleado_id,asignatura_id,grupo_id' })
      .select(`
        *,
        docente:empleado_id(primer_nombre, primer_apellido),
        asignatura:asignatura_id(nombre),
        grupo:grupo_id(nombre, grado:grado_id(nombre))
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Asignación académica realizada', data };
  }

  async getCargaAcademica(filtros: { empleado_id?: string; grupo_id?: string }) {
    let qb = this.supabase.admin
      .from('asignacion_docente')
      .select(`
        *,
        docente:empleado_id(id, primer_nombre, primer_apellido, cargo),
        asignatura:asignatura_id(id, nombre, area:area_id(nombre)),
        grupo:grupo_id(id, nombre, grado:grado_id(nombre))
      `);

    if (filtros.empleado_id) qb = qb.eq('empleado_id', filtros.empleado_id);
    if (filtros.grupo_id) qb = qb.eq('grupo_id', filtros.grupo_id);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
