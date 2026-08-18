import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateConceptoDto, UpdateConceptoDto, CreateDescuentoDto,
  CreateFacturaDto, FacturacionMasivaDto, CreatePagoDto,
} from './dto/financiero.dto';
import { GenerarPensionesDto } from './dto/generar-pensiones.dto';

@Injectable()
export class FinancieroService {
  constructor(private supabase: SupabaseService) { }

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

  async deleteConcepto(id: string) {
    const { error } = await this.supabase.admin
      .from('concepto_cobro')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Concepto eliminado' };
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
      .reduce((sum, f) => sum + Number(f.total || 0), 0);

    const totalRecaudado = (facturas || [])
      .filter((f) => f.estado === 'Pagada')
      .reduce((sum, f) => sum + Number(f.total || 0), 0);

    const totalPendiente = (facturas || [])
      .filter((f) => f.estado === 'Emitida')
      .reduce((sum, f) => sum + Number(f.total || 0), 0);

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

  // ======================
  // GENERACIÓN Y DEUDORES
  // ======================

  async generarPensionesMasivas(dto: GenerarPensionesDto) {
    const { mes, anio, anio_lectivo_id, articulo_id, concepto_cobro_id } = dto;

    let conceptoFinal: { id: string, nombre: string, valor: number, es_articulo: boolean };

    if (articulo_id) {
      const { data: art, error } = await this.supabase.admin
        .from('articulo_inventario')
        .select('*')
        .eq('id', articulo_id)
        .single();
      if (error || !art) throw new BadRequestException('Artículo no encontrado.');
      conceptoFinal = { id: art.id, nombre: art.nombre, valor: parseFloat(art.precio_venta) || 0, es_articulo: true };
    } else if (concepto_cobro_id) {
      const { data: conc, error } = await this.supabase.admin
        .from('concepto_cobro')
        .select('*')
        .eq('id', concepto_cobro_id)
        .single();
      if (error || !conc) throw new BadRequestException('Concepto de cobro no encontrado.');
      conceptoFinal = { id: conc.id, nombre: conc.nombre, valor: parseFloat(conc.valor) || 0, es_articulo: false };
    } else {
      // 1. Comportamiento por defecto: Encontrar el concepto de pensión
      const { data: conceptoPension, error: errorConcepto } = await this.supabase.admin
        .from('articulo_inventario')
        .select('*')
        .or('nombre.ilike.%pensión%,nombre.ilike.%pension%')
        .eq('es_servicio', true)
        .limit(1)
        .single();

      if (errorConcepto || !conceptoPension) {
        throw new BadRequestException('No se encontró el servicio de pensión en el inventario. Especifica un ID o asegúrate de tener un artículo de servicio que contenga la palabra "pensión".');
      }
      conceptoFinal = { ...conceptoPension, es_articulo: true };
    }

    const valorCobro = (conceptoFinal as any).es_articulo
      ? Number((conceptoFinal as any).precio_venta || (conceptoFinal as any).precio_unitario || (conceptoFinal as any).valor || 0)
      : Number((conceptoFinal as any).valor || 0);

    // 2. Obtener estudiantes activos
    const { data: matriculas, error: errorMatriculas } = await this.supabase.admin
      .from('matricula')
      .select('estudiante_id')
      .eq('estado', 'Activa');

    if (errorMatriculas) throw new BadRequestException('Error al obtener estudiantes activos.');
    if (!matriculas || matriculas.length === 0) return { message: 'No hay estudiantes activos.', generadas: 0 };

    let facturasGeneradas = 0;

    // 2. Obtener el último número de factura una sola vez
    const prefijo = 'FAC';
    const { data: ultimasFacturas } = await this.supabase.admin
      .from('factura')
      .select('numero_factura')
      .ilike('numero_factura', `${prefijo}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let ultimoNumero = 0;
    if (ultimasFacturas && ultimasFacturas.length > 0) {
      const match = ultimasFacturas[0].numero_factura.match(/-(\d+)$/);
      if (match) {
        ultimoNumero = parseInt(match[1], 10) || 0;
      }
    }

    // 2. Bucle de generación (La DB se encarga del número FAC- automáticamente)
    for (const mat of matriculas) {
      const estudianteId = mat.estudiante_id;

      // Check if already has invoice for this concept this month
      const { data: facturasExistentes } = await this.supabase.admin
        .from('factura_detalle')
        .select('id, factura:factura_id(estudiante_id, fecha_emision)')
        .eq('descripcion', conceptoFinal.nombre)
        .eq('factura.estudiante_id', estudianteId)
        .gte('factura.fecha_emision', `${anio}-${mes.toString().padStart(2, '0')}-01`)
        .lt('factura.fecha_emision', mes === 12 ? `${anio + 1}-01-01` : `${anio}-${(mes + 1).toString().padStart(2, '0')}-01`);

      if (facturasExistentes && facturasExistentes.length > 0) {
        continue;
      }

      const { data: nuevaFactura, error: errorFact } = await this.supabase.admin
        .from('factura')
        .insert({
          fecha_emision: new Date().toISOString().split('T')[0],
          subtotal: valorCobro,
          descuento_total: 0,
          iva_total: 0,
          total: valorCobro,
          estado: 'Emitida',
          estudiante_id: estudianteId,
          anio_lectivo_id: anio_lectivo_id || null,
          observaciones: `${conceptoFinal.nombre} - ${mes}/${anio}`,
        })
        .select('id')
        .single();

      if (errorFact) {
        console.error('Error creando factura para', estudianteId, errorFact);
        continue;
      }

      // Crear detalle
      const { error: errorDetalle } = await this.supabase.admin
        .from('factura_detalle')
        .insert({
          factura_id: nuevaFactura.id,
          cantidad: 1,
          valor_unitario: valorCobro,
          valor_iva: 0,
          subtotal: valorCobro,
          concepto_cobro_id: conceptoFinal.es_articulo ? null : conceptoFinal.id,
          articulo_inventario_id: conceptoFinal.es_articulo ? conceptoFinal.id : null,
          descripcion: conceptoFinal.nombre,
        });

      if (errorDetalle) {
        console.error('Error creando detalle para factura', nuevaFactura.id, errorDetalle);
      }

      facturasGeneradas++;
    }

    return { message: 'Proceso completado', generadas: facturasGeneradas };
  }

  async getDeudores(mes?: number, anio?: number, estadoFiltro?: string, grupoId?: string) {
    const m = mes || new Date().getMonth() + 1;
    const a = anio || new Date().getFullYear();

    let sql = `
      SELECT 
        e.id AS estudiante_id,
        TRIM(CONCAT(e.primer_nombre, ' ', COALESCE(e.segundo_nombre, ''), ' ', e.primer_apellido, ' ', COALESCE(e.segundo_apellido, ''))) AS estudiante_nombre,
        COALESCE(e.numero_documento, '') AS estudiante_documento,
        g.id AS grupo_id,
        COALESCE(g.nombre, 'Sin Grupo') AS grado,
        ac.id AS acudiente_id,
        TRIM(CONCAT(COALESCE(ac.primer_nombre, ''), ' ', COALESCE(ac.primer_apellido, ''))) AS acudiente_nombre,
        COALESCE(ac.numero_documento, '') AS acudiente_documento,
        COALESCE(ac.celular, '') AS acudiente_celular,
        COALESCE(ac.correo_electronico, '') AS acudiente_correo,
        f.id AS factura_id,
        f.numero_factura,
        COALESCE(f.total, 0)::numeric AS monto_total,
        COALESCE(p.monto_pagado, 0)::numeric AS monto_pagado,
        CASE 
          WHEN f.id IS NULL THEN 0
          WHEN f.estado = 'Pagada' THEN 0
          ELSE GREATEST(0, COALESCE(f.total, 0) - COALESCE(p.monto_pagado, 0))
        END::numeric AS deuda,
        CASE 
          WHEN f.id IS NULL THEN 'Sin Factura'
          WHEN f.estado = 'Pagada' OR (COALESCE(f.total, 0) > 0 AND COALESCE(p.monto_pagado, 0) >= f.total) THEN 'Al día'
          WHEN f.estado = 'Vencida' THEN 'En mora'
          ELSE 'Debe'
        END AS estado_pago,
        f.estado AS estado_factura,
        f.fecha_emision,
        p.ultima_fecha_pago,
        COALESCE(f.observaciones, 'Pensión') AS concepto
      FROM matricula m
      JOIN estudiante e ON m.estudiante_id = e.id
      LEFT JOIN grupo g ON m.grupo_id = g.id
      LEFT JOIN estudiante_acudiente ea ON e.id = ea.estudiante_id
      LEFT JOIN acudiente ac ON ea.acudiente_id = ac.id
      LEFT JOIN factura f ON e.id = f.estudiante_id 
        AND (f.estado IS NULL OR f.estado != 'Anulada') 
        AND EXTRACT(MONTH FROM f.fecha_emision) = $1 
        AND EXTRACT(YEAR FROM f.fecha_emision) = $2
        AND (
          f.observaciones ILIKE '%pens%' 
          OR EXISTS (
            SELECT 1 FROM factura_detalle df 
            WHERE df.factura_id = f.id 
              AND df.descripcion ILIKE '%pens%'
          )
        )
      LEFT JOIN (
        SELECT factura_id, SUM(monto) AS monto_pagado, MAX(fecha_pago) AS ultima_fecha_pago
        FROM pago
        GROUP BY factura_id
      ) p ON f.id = p.factura_id
      WHERE (m.estado IS NULL OR m.estado = 'Activa')
    `;

    const params: any[] = [m, a];

    if (grupoId) {
      params.push(grupoId);
      sql += ` AND m.grupo_id = $${params.length}`;
    }

    sql += ` ORDER BY g.nombre ASC, e.primer_apellido ASC, e.primer_nombre ASC`;

    const { data, error } = await this.supabase.admin.query(sql, params);
    if (error) {
      console.error('❌ Error ejecutando getDeudores SQL:', error);
      throw new BadRequestException(error.message);
    }

    // Deduplicar si un estudiante tiene múltiples acudientes vinculados
    const deudoresMap = new Map<string, any>();

    (data || []).forEach(row => {
      if (!deudoresMap.has(row.estudiante_id)) {
        deudoresMap.set(row.estudiante_id, {
          factura_id: row.factura_id,
          numero_factura: row.numero_factura || 'N/A',
          estudiante_id: row.estudiante_id,
          estudiante_nombre: row.estudiante_nombre,
          estudiante_documento: row.estudiante_documento,
          grado: row.grado,
          acudiente_id: row.acudiente_id,
          acudiente_nombre: row.acudiente_nombre || 'Sin acudiente',
          acudiente_documento: row.acudiente_documento || 'N/A',
          acudiente_celular: row.acudiente_celular || 'N/A',
          acudiente_correo: row.acudiente_correo || 'N/A',
          mes: m,
          anio: a,
          monto_total: Number(row.monto_total || 0),
          monto_pagado: Number(row.monto_pagado || 0),
          deuda: Number(row.deuda || 0),
          estado: row.estado_pago,
          estado_factura: row.estado_factura,
          fecha_emision: row.fecha_emision,
          fecha_pago: row.ultima_fecha_pago,
          concepto: row.concepto
        });
      }
    });

    let deudores = Array.from(deudoresMap.values());

    if (estadoFiltro && estadoFiltro !== 'Todos') {
      const efNorm = estadoFiltro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (efNorm === 'debe') {
        deudores = deudores.filter(d => {
          const stNorm = (d.estado || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          return stNorm === 'debe' || stNorm === 'en mora' || stNorm === 'sin factura' || d.deuda > 0;
        });
      } else if (efNorm === 'al dia') {
        deudores = deudores.filter(d => {
          const stNorm = (d.estado || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          return stNorm === 'al dia';
        });
      } else if (efNorm === 'sin factura') {
        deudores = deudores.filter(d => {
          const stNorm = (d.estado || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          return stNorm === 'sin factura';
        });
      }
    }

    return { deudores };
  }
}
