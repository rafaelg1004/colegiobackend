import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateSedeDto,
  CreateAnioLectivoDto,
  CreatePeriodoDto,
  CreateAreaDto,
  CreateAsignaturaDto,
  CreateAsignacionDocenteDto,
  CreateNivelDto,
  CreateGradoDto,
  UpdateGradoDto,
  CreateTipoActividadDto,
} from './dto/academico.dto';

@Injectable()
export class AcademicoService {
  constructor(private supabase: SupabaseService) {}

  // --- SEDES ---
  async crearSede(dto: CreateSedeDto) {
    const { data, error } = await this.supabase.admin
      .from('sede')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getSedes() {
    const { data, error } = await this.supabase.admin
      .from('sede')
      .select('*')
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- AÑO LECTIVO ---
  async crearAnioLectivo(dto: CreateAnioLectivoDto) {
    const { data, error } = await this.supabase.admin
      .from('anio_lectivo')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getAniosLectivos() {
    const { data, error } = await this.supabase.admin
      .from('anio_lectivo')
      .select('*')
      .order('anio', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    console.log('📅 Años lectivos:', data);
    return data;
  }

  // --- PERIODOS ---
  async crearPeriodo(dto: CreatePeriodoDto) {
    const { data, error } = await this.supabase.admin
      .from('periodo_academico')
      .insert(dto)
      .select()
      .single();
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
    const { data, error } = await this.supabase.admin
      .from('area')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getAreas() {
    const { data, error } = await this.supabase.admin
      .from('area')
      .select('*')
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateArea(id: string, dto: Partial<CreateAreaDto>) {
    const { data, error } = await this.supabase.admin
      .from('area')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Área actualizada', data };
  }

  async deleteArea(id: string) {
    const { error } = await this.supabase.admin
      .from('area')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Área eliminada' };
  }

  async crearAsignatura(dto: CreateAsignaturaDto) {
    const { data, error } = await this.supabase.admin
      .from('asignatura')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getAsignaturas() {
    const { data, error } = await this.supabase.admin
      .from('asignatura')
      .select('*, area:area_id(nombre), grado:grado_id(nombre)')
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateAsignatura(id: string, dto: Partial<CreateAsignaturaDto>) {
    const { data, error } = await this.supabase.admin
      .from('asignatura')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Asignatura actualizada', data };
  }

  async deleteAsignatura(id: string) {
    const { error } = await this.supabase.admin
      .from('asignatura')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Asignatura eliminada' };
  }

  // --- AÑO LECTIVO: update y delete ---
  async updateAnioLectivo(id: string, dto: Partial<CreateAnioLectivoDto>) {
    const { data, error } = await this.supabase.admin
      .from('anio_lectivo')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Año lectivo actualizado', data };
  }

  async deleteAnioLectivo(id: string) {
    const { error } = await this.supabase.admin
      .from('anio_lectivo')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Año lectivo eliminado' };
  }

  // --- PERIODO: update y delete ---
  async updatePeriodo(id: string, dto: Partial<CreatePeriodoDto>) {
    const { data, error } = await this.supabase.admin
      .from('periodo_academico')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Período actualizado', data };
  }

  async deletePeriodo(id: string) {
    const { error } = await this.supabase.admin
      .from('periodo_academico')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Período eliminado' };
  }

  // --- SEDE: update y delete ---
  async updateSede(id: string, dto: Partial<CreateSedeDto>) {
    const { data, error } = await this.supabase.admin
      .from('sede')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Sede actualizada', data };
  }

  async deleteSede(id: string) {
    const { error } = await this.supabase.admin
      .from('sede')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Sede eliminada' };
  }

  // --- CARGA ACADÉMICA (ASIGNACIONES) ---
  async asignarDocente(dto: CreateAsignacionDocenteDto) {
    const { data, error } = await this.supabase.admin
      .from('asignacion_docente')
      .upsert(dto, { onConflict: 'empleado_id,asignatura_id,grupo_id' })
      .select(
        `
        *,
        docente:empleado_id(primer_nombre, primer_apellido),
        asignatura:asignatura_id(nombre),
        grupo:grupo_id(nombre, grado:grado_id(nombre))
      `,
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Asignación académica realizada', data };
  }

  async getCargaAcademica(filtros: {
    empleado_id?: string;
    grupo_id?: string;
  }) {
    let qb = this.supabase.admin.from('asignacion_docente').select(`
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

  // --- NIVELES ---
  async getNiveles() {
    const { data, error } = await this.supabase.admin
      .from('nivel')
      .select('*')
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async crearNivel(dto: CreateNivelDto) {
    const { data, error } = await this.supabase.admin
      .from('nivel')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- GRADOS ---
  async getGrados(nivelId?: string) {
    let qb = this.supabase.admin
      .from('grado')
      .select('*, nivel:nivel_id(nombre)')
      .order('orden');
    if (nivelId) qb = qb.eq('nivel_id', nivelId);
    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async crearGrado(dto: CreateGradoDto) {
    const { data, error } = await this.supabase.admin
      .from('grado')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateGrado(id: string, dto: Partial<CreateGradoDto>) {
    const { data, error } = await this.supabase.admin
      .from('grado')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Grado actualizado', data };
  }

  async deleteGrado(id: string) {
    const { error } = await this.supabase.admin
      .from('grado')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Grado eliminado' };
  }

  // --- TIPOS DE ACTIVIDAD ---
  async getTiposActividad() {
    const { data, error } = await this.supabase.admin
      .from('tipo_actividad')
      .select('*')
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async crearTipoActividad(dto: CreateTipoActividadDto) {
    const { data, error } = await this.supabase.admin
      .from('tipo_actividad')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteTipoActividad(id: string) {
    const { error } = await this.supabase.admin
      .from('tipo_actividad')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Tipo de actividad eliminado' };
  }
}
