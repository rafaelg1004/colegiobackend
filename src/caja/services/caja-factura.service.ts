import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CajaFacturaService {
  constructor(private supabase: SupabaseService) {}

  async getFacturas(filtros: {
    acudiente_id?: string;
    estudiante_id?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) {
    let query = this.supabase.admin
      .from('factura')
      .select('*')
      .order('fecha_emision', { ascending: false });

    if (filtros.acudiente_id)
      query = query.eq('acudiente_id', filtros.acudiente_id);
    if (filtros.estudiante_id)
      query = query.eq('estudiante_id', filtros.estudiante_id);
    if (filtros.estado) query = query.eq('estado', filtros.estado);
    if (filtros.fecha_desde)
      query = query.gte('fecha_emision', filtros.fecha_desde);
    if (filtros.fecha_hasta)
      query = query.lte('fecha_emision', filtros.fecha_hasta);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getFacturaById(id: string) {
    const { data, error } = await this.supabase.admin
      .from('factura')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Factura no encontrada');
    return data;
  }

  async crearFactura(dto: any, usuarioId?: string) {
    const prefijo = dto.prefijo || 'FAC';
    const numeroFactura = await this.generarNumeroFactura(prefijo);

    let subtotal = 0;
    let ivaTotal = 0;

    for (const detalle of dto.detalles) {
      const subtotalLinea = detalle.cantidad * detalle.valor_unitario;
      subtotal += subtotalLinea;
      ivaTotal += detalle.cantidad * detalle.valor_iva;
    }

    const total = subtotal + ivaTotal;

    const { data: factura, error: errorFactura } = await this.supabase.admin
      .from('factura')
      .insert({
        prefijo,
        numero_factura: numeroFactura,
        fecha_emision:
          dto.fecha_emision || new Date().toISOString().split('T')[0],
        fecha_vencimiento: dto.fecha_vencimiento,
        subtotal,
        descuento_total: 0,
        iva_total: ivaTotal,
        total,
        estado: 'Emitida',
        acudiente_id: dto.acudiente_id,
        estudiante_id: dto.estudiante_id,
        anio_lectivo_id: dto.anio_lectivo_id,
        observaciones: dto.observaciones,
      })
      .select()
      .single();

    if (errorFactura) throw new BadRequestException(errorFactura.message);

    const detallesInsert = dto.detalles.map((detalle: any) => ({
      factura_id: factura.id,
      cantidad: detalle.cantidad,
      valor_unitario: detalle.valor_unitario,
      valor_iva: detalle.valor_iva,
      subtotal: detalle.cantidad * detalle.valor_unitario,
      concepto_cobro_id: detalle.concepto_cobro_id,
      descripcion: detalle.descripcion,
    }));

    const { error: errorDetalles } = await this.supabase.admin
      .from('factura_detalle')
      .insert(detallesInsert);

    if (errorDetalles) {
      await this.supabase.admin.from('factura').delete().eq('id', factura.id);
      throw new BadRequestException(errorDetalles.message);
    }

    return {
      message: 'Factura creada',
      data: await this.getFacturaById(factura.id),
    };
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

  async pagarFactura(id: string, montoPagado: number) {
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
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Factura actualizada', data };
  }

  async generarNumeroFactura(prefijo: string): Promise<string> {
    return ''; 
  }

  async getFacturasPendientesEstudiante(estudianteId: string) {
    const query = this.supabase.admin.query;
    
    const sqlFacturas = `
      SELECT id, numero_factura, fecha_emision, total, observaciones 
      FROM factura 
      WHERE estudiante_id = $1 AND estado = 'Emitida'
      ORDER BY fecha_emision ASC
    `;
    
    const { data: facturas, error: errorFac } = await query(sqlFacturas, [estudianteId]);
    if (errorFac) throw new BadRequestException(errorFac.message);
    if (!facturas || facturas.length === 0) return { data: [] };

    const facturaIds = facturas.map(f => f.id);
    const sqlDetalles = `
      SELECT id, factura_id, descripcion, cantidad, valor_unitario, valor_iva, subtotal, concepto_cobro_id
      FROM factura_detalle
      WHERE factura_id = ANY($1)
    `;
    
    const { data: detalles, error: errorDet } = await query(sqlDetalles, [facturaIds]);
    if (errorDet) throw new BadRequestException(errorDet.message);

    const facturaConDetalles = facturas.map(f => ({
      ...f,
      factura_detail: undefined, // ensure no collision
      factura_detalle: (detalles || []).filter(d => d.factura_id === f.id)
    }));

    return { data: facturaConDetalles };
  }
}
