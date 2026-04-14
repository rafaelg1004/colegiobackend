import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateInstitucionDto,
  UpdateInstitucionDto,
  CreateNivelDto,
  CreateGradoDto,
  UpdateGradoDto,
  CreateTipoActividadDto,
} from './dto/configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // INSTITUCIÓN
  // ======================

  async getInstitucion() {
    const { data, error } = await this.supabase.admin
      .from('institucion')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async crearInstitucion(dto: CreateInstitucionDto) {
    // Verificar si ya existe una institución
    const { data: existente } = await this.supabase.admin
      .from('institucion')
      .select('id')
      .single();

    if (existente) {
      throw new BadRequestException('Ya existe una institución registrada');
    }

    const { data, error } = await this.supabase.admin
      .from('institucion')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Institución creada', data };
  }

  async updateInstitucion(id: string, dto: UpdateInstitucionDto) {
    const { data, error } = await this.supabase.admin
      .from('institucion')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Institución no encontrada');
    return { message: 'Institución actualizada', data };
  }

  // ======================
  // NIVELES
  // ======================

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
    return { message: 'Nivel creado', data };
  }

  // ======================
  // GRADOS
  // ======================

  async getGrados(filtros: { nivel_id?: string; buscar?: string }) {
    let qb = this.supabase.admin
      .from('grado')
      .select('*, nivel:nivel_id(nombre)')
      .order('orden');

    if (filtros.nivel_id) qb = qb.eq('nivel_id', filtros.nivel_id);
    if (filtros.buscar) {
      qb = qb.or(
        `nombre.ilike.%${filtros.buscar}%,codigo.ilike.%${filtros.buscar}%`,
      );
    }

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
    return { message: 'Grado creado', data };
  }

  async updateGrado(id: string, dto: UpdateGradoDto) {
    const { data, error } = await this.supabase.admin
      .from('grado')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Grado no encontrado');
    return { message: 'Grado actualizado', data };
  }

  async deleteGrado(id: string) {
    // Verificar si hay grupos asociados
    const { data: grupos } = await this.supabase.admin
      .from('grupo')
      .select('id')
      .eq('grado_id', id)
      .limit(1);

    if (grupos && grupos.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar un grado con grupos asociados',
      );
    }

    const { data, error } = await this.supabase.admin
      .from('grado')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Grado eliminado', data };
  }

  // ======================
  // TIPOS DE ACTIVIDAD
  // ======================

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
    return { message: 'Tipo de actividad creado', data };
  }

  async deleteTipoActividad(id: string) {
    // Verificar si hay actividades asociadas
    const { data: actividades } = await this.supabase.admin
      .from('actividad_evaluativa')
      .select('id')
      .eq('tipo_actividad_id', id)
      .limit(1);

    if (actividades && actividades.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar un tipo de actividad con actividades asociadas',
      );
    }

    const { data, error } = await this.supabase.admin
      .from('tipo_actividad')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Tipo de actividad eliminado', data };
  }

  // ======================
  // CONCEPTOS DE COBRO
  // ======================

  async getConceptosCobro() {
    const { data, error } = await this.supabase.admin
      .from('concepto_cobro')
      .select('*, categoria_inventario:categoria_inventario_id(*)')
      .eq('activo', true)
      .order('nombre');

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async crearConceptoCobro(dto: any) {
    // Si tiene categoria_inventario_id, marcar afecta_inventario = true
    if (dto.categoria_inventario_id) {
      dto.afecta_inventario = true;
    }

    const { data, error } = await this.supabase.admin
      .from('concepto_cobro')
      .insert({ ...dto, activo: true })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Concepto de cobro creado', data };
  }

  async updateConceptoCobro(id: string, dto: any) {
    // Si se cambia la categoría, actualizar afecta_inventario
    if (dto.categoria_inventario_id !== undefined) {
      dto.afecta_inventario = !!dto.categoria_inventario_id;
    }

    const { data, error } = await this.supabase.admin
      .from('concepto_cobro')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Concepto de cobro no encontrado');
    return { message: 'Concepto de cobro actualizado', data };
  }

  async deleteConceptoCobro(id: string) {
    // Soft delete: marcar como inactivo
    const { data, error } = await this.supabase.admin
      .from('concepto_cobro')
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Concepto de cobro no encontrado');
    return { message: 'Concepto de cobro eliminado', data };
  }
}
