import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateArticuloDto, UpdateArticuloDto, CreateMovimientoDto, CreateEspacioDto } from './dto/inventario.dto';

@Injectable()
export class InventarioService {
  constructor(private supabase: SupabaseService) {}

  // --- Categorías ---
  async getCategorias() {
    const { data, error } = await this.supabase.admin
      .from('categoria_inventario')
      .select('*')
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async crearCategoria(nombre: string) {
    const { data, error } = await this.supabase.admin
      .from('categoria_inventario')
      .insert({ nombre })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Categoría creada', data };
  }

  async deleteCategoria(id: string) {
    const { error } = await this.supabase.admin
      .from('categoria_inventario')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Categoría eliminada' };
  }

  // --- Artículos ---
  async crearArticulo(dto: CreateArticuloDto) {
    const { data, error } = await this.supabase.admin
      .from('articulo_inventario')
      .insert(dto)
      .select(`*, categoria:categoria_id(nombre)`)
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Artículo creado', data };
  }

  async getArticulos(filtros: { categoria_id?: string; buscar?: string; alerta?: string }) {
    let qb = this.supabase.admin
      .from('articulo_inventario')
      .select(`*, categoria:categoria_id(nombre)`)
      .order('nombre');

    if (filtros.categoria_id) qb = qb.eq('categoria_id', filtros.categoria_id);
    if (filtros.buscar) {
      qb = qb.or(`nombre.ilike.%${filtros.buscar}%,codigo_interno.ilike.%${filtros.buscar}%`);
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);

    let resultado = data || [];

    // Filtrar por alerta de stock
    if (filtros.alerta === 'bajo') {
      resultado = resultado.filter((a) => a.cantidad_stock > 0 && a.cantidad_stock <= a.cantidad_minima);
    } else if (filtros.alerta === 'agotado') {
      resultado = resultado.filter((a) => a.cantidad_stock <= 0);
    }

    return resultado;
  }

  async getArticulo(id: string) {
    const { data, error } = await this.supabase.admin
      .from('articulo_inventario')
      .select(`
        *, 
        categoria:categoria_id(nombre),
        movimiento_inventario(tipo, cantidad, motivo, fecha, responsable:responsable_id(primer_nombre, primer_apellido))
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Artículo no encontrado');
    return data;
  }

  async updateArticulo(id: string, dto: UpdateArticuloDto) {
    const { data, error } = await this.supabase.admin
      .from('articulo_inventario')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Artículo no encontrado');
    return { message: 'Artículo actualizado', data };
  }

  async deleteArticulo(id: string) {
    const { error } = await this.supabase.admin
      .from('articulo_inventario')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Artículo eliminado' };
  }

  // --- Movimientos ---
  async registrarMovimiento(dto: CreateMovimientoDto, responsableId?: string) {
    // Validar stock suficiente para salidas
    if (dto.tipo === 'Salida') {
      const { data: articulo } = await this.supabase.admin
        .from('articulo_inventario')
        .select('cantidad_stock, nombre')
        .eq('id', dto.articulo_id)
        .single();

      if (!articulo) throw new NotFoundException('Artículo no encontrado');
      if (articulo.cantidad_stock < dto.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente de "${articulo.nombre}". Disponible: ${articulo.cantidad_stock}, solicitado: ${dto.cantidad}`,
        );
      }
    }

    // El trigger fn_actualizar_stock se encarga de actualizar el stock
    const { data, error } = await this.supabase.admin
      .from('movimiento_inventario')
      .insert({
        ...dto,
        responsable_id: responsableId || null,
      })
      .select(`
        *,
        articulo:articulo_id(nombre, cantidad_stock),
        responsable:responsable_id(primer_nombre, primer_apellido)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: `Movimiento de ${dto.tipo.toLowerCase()} registrado`, data };
  }

  async getMovimientos(filtros: { articulo_id?: string; tipo?: string; fecha_desde?: string; fecha_hasta?: string }) {
    let qb = this.supabase.admin
      .from('movimiento_inventario')
      .select(`
        *,
        articulo:articulo_id(nombre, codigo_interno),
        responsable:responsable_id(primer_nombre, primer_apellido)
      `)
      .order('fecha', { ascending: false })
      .limit(100);

    if (filtros.articulo_id) qb = qb.eq('articulo_id', filtros.articulo_id);
    if (filtros.tipo) qb = qb.eq('tipo', filtros.tipo);
    if (filtros.fecha_desde) qb = qb.gte('fecha', filtros.fecha_desde);
    if (filtros.fecha_hasta) qb = qb.lte('fecha', filtros.fecha_hasta);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- Alertas de stock ---
  async getAlertas() {
    const { data, error } = await this.supabase.admin
      .from('v_inventario_alertas')
      .select('*')
      .in('alerta', ['SIN STOCK', 'STOCK BAJO']);

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // --- Espacios físicos ---
  async crearEspacio(dto: CreateEspacioDto) {
    const { data, error } = await this.supabase.admin
      .from('espacio_fisico')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Espacio creado', data };
  }

  async getEspacios(sedeId?: string) {
    let qb = this.supabase.admin
      .from('espacio_fisico')
      .select(`*, sede:sede_id(nombre)`)
      .order('nombre');

    if (sedeId) qb = qb.eq('sede_id', sedeId);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteEspacio(id: string) {
    const { error } = await this.supabase.admin
      .from('espacio_fisico')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Espacio eliminado' };
  }

  // --- Resumen ---
  async getResumen() {
    const { data: articulos } = await this.supabase.admin
      .from('articulo_inventario')
      .select('cantidad_stock, precio_unitario, estado, cantidad_minima');

    const items = articulos || [];
    const valorTotal = items.reduce((s, a) => s + (a.cantidad_stock * (a.precio_unitario || 0)), 0);

    return {
      total_articulos: items.length,
      valor_total_inventario: valorTotal,
      disponibles: items.filter((a) => a.estado === 'Disponible').length,
      agotados: items.filter((a) => a.estado === 'Agotado').length,
      stock_bajo: items.filter((a) => a.cantidad_stock > 0 && a.cantidad_stock <= a.cantidad_minima).length,
      dados_de_baja: items.filter((a) => a.estado === 'Dado de baja').length,
    };
  }
}
