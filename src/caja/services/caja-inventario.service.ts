import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ArticuloVenta } from '../interfaces';

@Injectable()
export class CajaInventarioService {
  constructor(private supabase: SupabaseService) {}

  async getConceptosCobro() {
    const { data: conceptos, error } = await this.supabase.admin
      .from('concepto_cobro')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw new BadRequestException(error.message);
    return conceptos || [];
  }

  async getArticulosPorCategoria(categoriaId: string) {
    const { data: articulos, error } = await this.supabase.admin
      .from('articulo_inventario')
      .select('*')
      .eq('categoria_id', categoriaId)
      .order('nombre');

    if (error) throw new BadRequestException(error.message);
    return (articulos || []).filter((a) => a.es_servicio || a.cantidad_stock > 0);
  }

  async getArticulosConcepto(conceptoId: string) {
    const { data: relaciones, error } = await this.supabase.admin
      .from('concepto_articulo')
      .select(
        `
        *,
        articulo:articulo_inventario_id(*)
      `,
      )
      .eq('concepto_cobro_id', conceptoId)
      .eq('activo', true);

    if (error) throw new BadRequestException(error.message);
    return relaciones || [];
  }

  async descontarInventario(
    conceptoId: string,
    articulosVenta: ArticuloVenta[],
    movimientoCajaId: string,
    usuarioId?: string,
  ) {
    const query = this.supabase.admin.query;

    let responsableId: string | null = null;
    if (usuarioId) {
      try {
        const { data: perfil } = await this.supabase.admin
          .from('perfil_usuario')
          .select('empleado_id')
          .eq('id', usuarioId)
          .single();
        responsableId = perfil?.empleado_id || null;
      } catch (e) {
        console.log('No se pudo obtener perfil para responsable_id');
      }
    }

    console.log(`📦 Iniciando descuento de inventario para ${articulosVenta.length} artículos`);

    for (const articulo of articulosVenta) {
      console.log(`🔍 Procesando artículo ID: ${articulo.articulo_inventario_id}, Cantidad: ${articulo.cantidad}`);
      
      const { data: stockData } = await query(
        'SELECT cantidad_stock, nombre, es_servicio FROM articulo_inventario WHERE id = $1',
        [articulo.articulo_inventario_id],
      );

      const stockActual = stockData?.[0]?.cantidad_stock || 0;
      const nombreArticulo = stockData?.[0]?.nombre || 'Artículo';
      const esServicio = stockData?.[0]?.es_servicio || false;

      if (esServicio) {
        console.log(`ℹ️ "${nombreArticulo}" es un servicio. Saltando descuento de inventario.`);
        continue;
      }

      console.log(`📊 Stock actual de "${nombreArticulo}": ${stockActual}`);

      if (stockActual < articulo.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente de "${nombreArticulo}". Disponible: ${stockActual}, solicitado: ${articulo.cantidad}`,
        );
      }

      const insertData: any = {
        articulo_id: articulo.articulo_inventario_id,
        tipo: 'Salida',
        cantidad: articulo.cantidad,
        motivo: `Venta - Movimiento Caja #${movimientoCajaId}`,
        fecha: new Date().toISOString(),
      };

      if (responsableId) {
        insertData.responsable_id = responsableId;
      }

      const { error: movError } = await this.supabase.admin
        .from('movimiento_inventario')
        .insert(insertData);

      if (movError) {
        console.error('❌ Error al insertar movimiento_inventario:', movError);
        throw new BadRequestException(
          `Error al registrar movimiento de inventario: ${movError.message}`,
        );
      }
      console.log(`✅ Movimiento de inventario registrado para "${nombreArticulo}" (El stock se actualiza via Trigger)`);
    }
  }

  async aumentarInventario(
    conceptoId: string,
    articulosCompra: ArticuloVenta[],
    movimientoCajaId: string,
    usuarioId?: string,
  ) {
    const query = this.supabase.admin.query;

    let responsableId: string | null = null;
    if (usuarioId) {
      try {
        const { data: perfil } = await this.supabase.admin
          .from('perfil_usuario')
          .select('empleado_id')
          .eq('id', usuarioId)
          .single();
        responsableId = perfil?.empleado_id || null;
      } catch (e) {
        console.log('No se pudo obtener perfil para responsable_id');
      }
    }

    console.log(`📦 Iniciando aumento de inventario para ${articulosCompra.length} artículos`);

    for (const articulo of articulosCompra) {
      console.log(`🔍 Procesando artículo ID: ${articulo.articulo_inventario_id}, Cantidad: ${articulo.cantidad}`);
      
      const { data: stockData } = await query(
        'SELECT nombre, es_servicio FROM articulo_inventario WHERE id = $1',
        [articulo.articulo_inventario_id],
      );

      const nombreArticulo = stockData?.[0]?.nombre || 'Artículo';
      const esServicio = stockData?.[0]?.es_servicio || false;

      if (esServicio) {
        console.log(`ℹ️ "${nombreArticulo}" es un servicio. Saltando aumento de inventario.`);
        continue;
      }

      const insertData: any = {
        articulo_id: articulo.articulo_inventario_id,
        tipo: 'Entrada',
        cantidad: articulo.cantidad,
        motivo: `Compra - Movimiento Caja #${movimientoCajaId}`,
        fecha: new Date().toISOString(),
      };

      if (responsableId) {
        insertData.responsable_id = responsableId;
      }

      const { error: movError } = await this.supabase.admin
        .from('movimiento_inventario')
        .insert(insertData);

      if (movError) {
        console.error('❌ Error al insertar movimiento_inventario (Entrada):', movError);
        throw new BadRequestException(
          `Error al registrar entrada de inventario: ${movError.message}`,
        );
      }
      console.log(`✅ Entrada de inventario registrada para "${nombreArticulo}"`);
    }
  }
}
