import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateConceptoDto, UpdateConceptoDto, CreateDescuentoDto,
  CreateFacturaDto, FacturacionMasivaDto, CreatePagoDto,
} from './dto/financiero.dto';

@Injectable()
export class FinancieroService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // CONCEPTOS DE COBRO
  // ======================

  async crearConcepto(dto: CreateConceptoDto) {
    const { data, error } = await this.supabase.admin
      .from('concepto_cobro')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Concepto creado', data };
  }

  async getConceptos(activo?: boolean) {
    let qb = this.supabase.admin.from('concepto_cobro').select('*').order('nombre');
    if (activo !== undefined) qb = qb.eq('activo', activo);
    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateConcepto(id: string, dto: UpdateConceptoDto) {
    const { data, error } = await this.supabase.admin
      .from('concepto_cobro')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Concepto actualizado', data };
  }

  // ======================
  // DESCUENTOS
  // ======================

  async crearDescuento(dto: CreateDescuentoDto) {
    const { data, error } = await this.supabase.admin
      .from('descuento')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { message: 'Descuento creado', data };
  }

  async getDescuentos() {
    const { data, error } = await this.supabase.admin
      .from('descuento')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ======================
  // FACTURAS
  // ======================

  private async generarNumeroFactura(prefijo?: string): Promise<string> {
    const { count } = await this.supabase.admin
      .from('factura')
      .select('id', { count: 'exact', head: true });

    const numero = ((count ?? 0) + 1).toString().padStart(6, '0');
    return prefijo ? `${prefijo}-${numero}` : `FAC-${numero}`;
  }

  async crearFactura(dto: CreateFacturaDto) {
    const numeroFactura = await this.generarNumeroFactura(dto.prefijo);

    // Obtener datos de los conceptos para calcular montos
    const conceptoIds = dto.detalles.map((d) => d.concepto_cobro_id);
    const { data: conceptos } = await this.supabase.admin
      .from('concepto_cobro')
      .select('*')
      .in('id', conceptoIds);

    if (!conceptos || conceptos.length === 0) {
      throw new BadRequestException('Conceptos de cobro no encontrados');
    }

    // Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;

    const detallesConValor = dto.detalles.map((det) => {
      const concepto = conceptos.find((c) => c.id === det.concepto_cobro_id);
      if (!concepto) throw new BadRequestException(`Concepto ${det.concepto_cobro_id} no encontrado`);

      const cantidad = det.cantidad || 1;
      const subDet = concepto.valor * cantidad;
      const ivaDet = concepto.aplica_iva ? subDet * (concepto.porcentaje_iva / 100) : 0;

      subtotal += subDet;
      ivaTotal += ivaDet;

      return {
        concepto_cobro_id: det.concepto_cobro_id,
        cantidad,
        valor_unitario: concepto.valor,
        subtotal: subDet,
        valor_iva: ivaDet,
        descuento_id: det.descuento_id || null,
        descripcion: det.descripcion || concepto.nombre,
      };
    });

    // Crear factura
    const { data: factura, error: factError } = await this.supabase.admin
      .from('factura')
      .insert({
        numero_factura: numeroFactura,
        prefijo: dto.prefijo || null,
        acudiente_id: dto.acudiente_id,
        estudiante_id: dto.estudiante_id || null,
        anio_lectivo_id: dto.anio_lectivo_id || null,
        fecha_vencimiento: dto.fecha_vencimiento || null,
        subtotal,
        iva_total: ivaTotal,
        total: subtotal + ivaTotal,
        observaciones: dto.observaciones || null,
      })
      .select()
      .single();

    if (factError) throw new BadRequestException(factError.message);

    // Crear detalles de factura
    const detallesInsert = detallesConValor.map((d) => ({
      ...d,
      factura_id: factura.id,
    }));

    const { error: detError } = await this.supabase.admin
      .from('factura_detalle')
      .insert(detallesInsert);

    if (detError) throw new BadRequestException(detError.message);

    return {
      message: `Factura ${numeroFactura} creada exitosamente`,
      data: { ...factura, detalles: detallesInsert },
    };
  }

  async facturacionMasiva(dto: FacturacionMasivaDto) {
    // Obtener concepto
    const { data: concepto } = await this.supabase.admin
      .from('concepto_cobro')
      .select('*')
      .eq('id', dto.concepto_cobro_id)
      .single();

    if (!concepto) throw new NotFoundException('Concepto de cobro no encontrado');

    // Obtener estudiantes con sus acudientes principales
    let qbMatriculas = this.supabase.admin
      .from('matricula')
      .select(`
        estudiante:estudiante_id(
          id,
          estudiante_acudiente(acudiente_id, es_principal)
        ),
        grupo_id
      `)
      .eq('estado', 'Activa');

    if (dto.anio_lectivo_id) qbMatriculas = qbMatriculas.eq('anio_lectivo_id', dto.anio_lectivo_id);
    if (dto.grupo_id) qbMatriculas = qbMatriculas.eq('grupo_id', dto.grupo_id);

    const { data: matriculas, error: matErr } = await qbMatriculas;
    if (matErr) throw new BadRequestException(matErr.message);

    const facturasCreadas: any[] = [];
    let errores = 0;

    for (const mat of matriculas || []) {
      const est = mat.estudiante as any;
      if (!est?.estudiante_acudiente?.length) {
        errores++;
        continue;
      }

      // Tomar acudiente principal o el primero disponible
      const relAcudiente = est.estudiante_acudiente.find((ea: any) => ea.es_principal)
        || est.estudiante_acudiente[0];

      try {
        const resultado = await this.crearFactura({
          acudiente_id: relAcudiente.acudiente_id,
          estudiante_id: est.id,
          anio_lectivo_id: dto.anio_lectivo_id,
          fecha_vencimiento: dto.fecha_vencimiento,
          prefijo: dto.prefijo,
          detalles: [{ concepto_cobro_id: dto.concepto_cobro_id }],
        });
        facturasCreadas.push(resultado.data);
      } catch {
        errores++;
      }
    }

    return {
      message: `Facturación masiva completada: ${facturasCreadas.length} facturas creadas, ${errores} errores`,
      total_creadas: facturasCreadas.length,
      total_errores: errores,
    };
  }

  async getFacturas(filtros: {
    estado?: string;
    acudiente_id?: string;
    estudiante_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(filtros.page || '1');
    const limit = parseInt(filtros.limit || '20');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let qb = this.supabase.admin
      .from('factura')
      .select(`
        *,
        acudiente:acudiente_id(primer_nombre, primer_apellido, numero_documento),
        estudiante:estudiante_id(primer_nombre, primer_apellido, numero_documento)
      `, { count: 'exact' })
      .order('fecha_emision', { ascending: false })
      .range(from, to);

    if (filtros.estado) qb = qb.eq('estado', filtros.estado);
    if (filtros.acudiente_id) qb = qb.eq('acudiente_id', filtros.acudiente_id);
    if (filtros.estudiante_id) qb = qb.eq('estudiante_id', filtros.estudiante_id);
    if (filtros.fecha_desde) qb = qb.gte('fecha_emision', filtros.fecha_desde);
    if (filtros.fecha_hasta) qb = qb.lte('fecha_emision', filtros.fecha_hasta);

    const { data, error, count } = await qb;
    if (error) throw new BadRequestException(error.message);

    return {
      data,
      meta: { total: count, page, limit, total_pages: Math.ceil((count ?? 0) / limit) },
    };
  }

  async getFacturaDetalle(facturaId: string) {
    const { data: factura, error } = await this.supabase.admin
      .from('factura')
      .select(`
        *,
        acudiente:acudiente_id(id, primer_nombre, primer_apellido, numero_documento, celular, correo_electronico),
        estudiante:estudiante_id(id, primer_nombre, primer_apellido, numero_documento),
        factura_detalle(
          id, cantidad, valor_unitario, valor_iva, subtotal, descripcion,
          concepto:concepto_cobro_id(nombre, periodicidad),
          descuento:descuento_id(nombre, tipo, valor)
        ),
        pago(id, fecha_pago, monto, metodo_pago, referencia_pago)
      `)
      .eq('id', facturaId)
      .single();

    if (error || !factura) throw new NotFoundException('Factura no encontrada');
    return factura;
  }

  async anularFactura(facturaId: string) {
    const { data, error } = await this.supabase.admin
      .from('factura')
      .update({ estado: 'Anulada' })
      .eq('id', facturaId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Factura anulada', data };
  }

  // ======================
  // PAGOS
  // ======================

  async registrarPago(dto: CreatePagoDto, recibidoPor?: string) {
    // Verificar que la factura existe y no está anulada
    const { data: factura } = await this.supabase.admin
      .from('factura')
      .select('id, total, estado')
      .eq('id', dto.factura_id)
      .single();

    if (!factura) throw new NotFoundException('Factura no encontrada');
    if (factura.estado === 'Anulada') throw new BadRequestException('No se puede pagar una factura anulada');
    if (factura.estado === 'Pagada') throw new BadRequestException('La factura ya está pagada');

    const { data, error } = await this.supabase.admin
      .from('pago')
      .insert({
        factura_id: dto.factura_id,
        monto: dto.monto,
        metodo_pago: dto.metodo_pago,
        referencia_pago: dto.referencia_pago || null,
        recibido_por: recibidoPor || null,
        observaciones: dto.observaciones || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // El trigger fn_actualizar_estado_factura se encarga de cambiar el estado
    return { message: 'Pago registrado exitosamente', data };
  }

  async getPagosPorFactura(facturaId: string) {
    const { data, error } = await this.supabase.admin
      .from('pago')
      .select(`
        *,
        recibido:recibido_por(primer_nombre, primer_apellido)
      `)
      .eq('factura_id', facturaId)
      .order('fecha_pago', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ======================
  // CARTERA
  // ======================

  async getCartera(filtros: { estado?: string; acudiente_id?: string; min_dias_mora?: string }) {
    let qb = this.supabase.admin
      .from('cartera')
      .select(`
        *,
        acudiente:acudiente_id(primer_nombre, primer_apellido, numero_documento, celular),
        estudiante:estudiante_id(primer_nombre, primer_apellido),
        factura:factura_id(numero_factura, total, fecha_emision, fecha_vencimiento)
      `)
      .gt('saldo_pendiente', 0)
      .order('dias_mora', { ascending: false });

    if (filtros.estado) qb = qb.eq('estado', filtros.estado);
    if (filtros.acudiente_id) qb = qb.eq('acudiente_id', filtros.acudiente_id);
    if (filtros.min_dias_mora) qb = qb.gte('dias_mora', parseInt(filtros.min_dias_mora));

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getResumenCartera() {
    const { data, error } = await this.supabase.admin
      .from('v_resumen_cartera')
      .select('*')
      .gt('deuda_total', 0)
      .order('deuda_total', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async registrarGestionCartera(carteraId: string, gestion: string) {
    const { data, error } = await this.supabase.admin
      .from('cartera')
      .update({
        ultima_gestion: gestion,
        fecha_ultima_gestion: new Date().toISOString().split('T')[0],
      })
      .eq('id', carteraId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Gestión registrada', data };
  }

  // ======================
  // REPORTES FINANCIEROS
  // ======================

  async getResumenFinanciero(anioLectivoId?: string) {
    // Total facturado
    let qbFact = this.supabase.admin.from('factura').select('total, estado');
    if (anioLectivoId) qbFact = qbFact.eq('anio_lectivo_id', anioLectivoId);
    const { data: facturas } = await qbFact;

    // Total recaudado
    const { data: pagos } = await this.supabase.admin.from('pago').select('monto');

    // Cartera
    const { data: cartera } = await this.supabase.admin
      .from('cartera')
      .select('saldo_pendiente, estado')
      .gt('saldo_pendiente', 0);

    const totalFacturado = (facturas || [])
      .filter((f) => f.estado !== 'Anulada')
      .reduce((sum, f) => sum + (f.total || 0), 0);

    const totalRecaudado = (pagos || []).reduce((sum, p) => sum + (p.monto || 0), 0);

    const totalPendiente = (cartera || []).reduce((sum, c) => sum + (c.saldo_pendiente || 0), 0);

    const enMora = (cartera || []).filter((c) => c.estado === 'En mora').length;
    const cobroJuridico = (cartera || []).filter((c) => c.estado === 'En cobro jurídico').length;

    return {
      total_facturado: totalFacturado,
      total_recaudado: totalRecaudado,
      total_pendiente: totalPendiente,
      porcentaje_recaudo: totalFacturado > 0
        ? Math.round((totalRecaudado / totalFacturado) * 1000) / 10
        : 0,
      facturas_por_estado: {
        emitidas: (facturas || []).filter((f) => f.estado === 'Emitida').length,
        pagadas: (facturas || []).filter((f) => f.estado === 'Pagada').length,
        parciales: (facturas || []).filter((f) => f.estado === 'Parcial').length,
        vencidas: (facturas || []).filter((f) => f.estado === 'Vencida').length,
        anuladas: (facturas || []).filter((f) => f.estado === 'Anulada').length,
      },
      cartera: {
        total_pendiente: totalPendiente,
        en_mora: enMora,
        cobro_juridico: cobroJuridico,
      },
    };
  }
}
