import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateInstitucionDto,
  UpdateInstitucionDto,
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
