import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface FacturaDetalleInput {
  cantidad: number;
  valor_unitario: number;
  valor_iva: number;
  concepto_cobro_id?: string;
  descripcion?: string;
  articulo_inventario_id?: string;
}

interface CrearFacturaDto {
  prefijo?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  acudiente_id?: string;
  estudiante_id?: string;
  anio_lectivo_id?: string;
  observaciones?: string;
  detalles: FacturaDetalleInput[];
}

@Injectable()
export class FacturacionService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // FACTURAS
  // ======================

  async getFacturas(filtros: {
    acudiente_id?: string;
    estudiante_id?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) {
    let query = this.supabase.admin
      .from('factura')
      .select(`
        *,
        acudiente:acudiente_id(*),
        estudiante:estudiante_id(*),
        detalles:factura_detalle(*, concepto:concepto_cobro_id(*))
      `)
      .order('fecha_emision', { ascending: false });

    if (filtros.acudiente_id) query = query.eq('acudiente_id', filtros.acudiente_id);
    if (filtros.estudiante_id) query = query.eq('estudiante_id', filtros.estudiante_id);
    if (filtros.estado) query = query.eq('estado', filtros.estado);
    if (filtros.fecha_desde) query = query.gte('fecha_emision', filtros.fecha_desde);
    if (filtros.fecha_hasta) query = query.lte('fecha_emision', filtros.fecha_hasta);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getFacturaById(id: string) {
    const { data, error } = await this.supabase.admin
      .from('factura')
      .select(`
        *,
        acudiente:acudiente_id(*),
        estudiante:estudiante_id(*),
        detalles:factura_detalle(*, concepto:concepto_cobro_id(*), articulo:articulo_inventario_id(*))
      `)
      .eq('id', id)
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Factura no encontrada');
    return data;
  }

  async crearFactura(dto: CrearFacturaDto, usuarioId?: string) {
    // Generar número de factura
    const prefijo = dto.prefijo || 'FAC';
    const numeroFactura = await this.generarNumeroFactura(prefijo);

    // Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;
    
    for (const detalle of dto.detalles) {
      const subtotalLinea = detalle.cantidad * detalle.valor_unitario;
      subtotal += subtotalLinea;
      ivaTotal += detalle.cantidad * detalle.valor_iva;
    }

    const total = subtotal + ivaTotal;

    // Crear factura
    const { data: factura, error: errorFactura } = await this.supabase.admin
      .from('factura')
      .insert({
        prefijo,
        numero_factura: numeroFactura,
        fecha_emision: dto.fecha_emision || new Date().toISOString().split('T')[0],
        fecha_vencimiento: dto.fecha_vencimiento,
        subtotal,
        descuento_total: 0,
        iva_total: ivaTotal,
        total,
        estado: 'PENDIENTE',
        acudiente_id: dto.acudiente_id,
        estudiante_id: dto.estudiante_id,
        anio_lectivo_id: dto.anio_lectivo_id,
        observaciones: dto.observaciones,
      })
      .select()
      .single();

    if (errorFactura) throw new BadRequestException(errorFactura.message);

    // Crear detalles
    const detallesInsert = dto.detalles.map((detalle) => ({
      factura_id: factura.id,
      cantidad: detalle.cantidad,
      valor_unitario: detalle.valor_unitario,
      valor_iva: detalle.valor_iva,
      subtotal: detalle.cantidad * detalle.valor_unitario,
      concepto_cobro_id: detalle.concepto_cobro_id,
      articulo_inventario_id: detalle.articulo_inventario_id,
      descripcion: detalle.descripcion,
    }));

    const { error: errorDetalles } = await this.supabase.admin
      .from('factura_detalle')
      .insert(detallesInsert);

    if (errorDetalles) {
      // Rollback: eliminar factura
      await this.supabase.admin.from('factura').delete().eq('id', factura.id);
      throw new BadRequestException(errorDetalles.message);
    }

    return { message: 'Factura creada', data: await this.getFacturaById(factura.id) };
  }

  async anularFactura(id: string) {
    const { data, error } = await this.supabase.admin
      .from('factura')
      .update({ estado: 'ANULADA' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Factura no encontrada');
    return { message: 'Factura anulada', data };
  }

  async pagarFactura(id: string, montoPagado: number, metodoPago?: string) {
    const factura = await this.getFacturaById(id);
    
    if (factura.estado === 'ANULADA') {
      throw new BadRequestException('No se puede pagar una factura anulada');
    }
    if (factura.estado === 'PAGADA') {
      throw new BadRequestException('La factura ya está pagada');
    }

    const nuevoEstado = montoPagado >= factura.total ? 'PAGADA' : 'PARCIAL';

    const { data, error } = await this.supabase.admin
      .from('factura')
      .update({ 
        estado: nuevoEstado,
        metodo_pago: metodoPago,
        fecha_pago: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Factura actualizada', data };
  }

  private async generarNumeroFactura(prefijo: string): Promise<string> {
    const { data } = await this.supabase.admin
      .from('factura')
      .select('numero_factura')
      .ilike('numero_factura', `${prefijo}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let siguienteNumero = 1;
    if (data && data.length > 0) {
      const ultimo = data[0].numero_factura;
      const match = ultimo.match(/-(\d+)$/);
      if (match) {
        siguienteNumero = parseInt(match[1]) + 1;
      }
    }

    return `${prefijo}-${siguienteNumero.toString().padStart(6, '0')}`;
  }

  // ======================
  // ESTADISTICAS
  // ======================

  async getEstadisticasFacturacion(fechaDesde: string, fechaHasta: string) {
    const { data: facturas, error } = await this.supabase.admin
      .from('factura')
      .select('estado, total, iva_total, subtotal')
      .gte('fecha_emision', fechaDesde)
      .lte('fecha_emision', fechaHasta);

    if (error) throw new BadRequestException(error.message);

    const stats = {
      total_facturas: facturas?.length || 0,
      total_ventas: 0,
      total_iva: 0,
      pendiente: 0,
      pagada: 0,
      anulada: 0,
    };

    facturas?.forEach((f) => {
      stats.total_ventas += f.total || 0;
      stats.total_iva += f.iva_total || 0;
      if (f.estado === 'PENDIENTE') stats.pendiente += f.total || 0;
      if (f.estado === 'PAGADA') stats.pagada += f.total || 0;
      if (f.estado === 'ANULADA') stats.anulada += f.total || 0;
    });

    return stats;
  }
}
