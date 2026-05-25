// ================================================
// src/caja/caja.service.ts - Contabilidad Simple para Colegio
// ================================================
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Conceptos predefinidos para colegio pequeño
const CONCEPTOS_INGRESO = [
  'Matrícula',
  'Pensión Mensual',
  'Meriendas',
  'Libros',
  'Uniformes',
  'Formularios',
  'Derecho a Grado',
  'Clausura/Graduación',
  'Otro Ingreso',
];

const CONCEPTOS_EGRESO = [
  'Nómina Docentes',
  'Nómina Administrativos',
  'Servicios Públicos',
  'Arriendo',
  'Suministros Oficina',
  'Mantenimiento',
  'Otro Gasto',
];

interface MovimientoCaja {
  id?: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  estudiante_id?: string;
  estudiante_nombre?: string;
  observacion?: string;
  registrado_por?: string;
  // Campos para inventario
  articulos?: ArticuloVenta[];
}

interface ArticuloVenta {
  articulo_inventario_id: string;
  cantidad: number;
  nombre?: string;
  precio_unitario?: number;
}

@Injectable()
export class CajaService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // CONCEPTOS CON INVENTARIO
  // ======================

  async getConceptosCobro() {
    // Obtener todos los conceptos activos (con y sin inventario)
    const { data: conceptos, error } = await this.supabase.admin
      .from('concepto_cobro')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw new BadRequestException(error.message);
    return conceptos || [];
  }

  async getArticulosPorCategoria(categoriaId: string) {
    // Obtener artículos de una categoría
    const { data: articulos, error } = await this.supabase.admin
      .from('articulo_inventario')
      .select('*')
      .eq('categoria_id', categoriaId)
      .order('nombre');

    if (error) throw new BadRequestException(error.message);
    // Filtrar solo artículos con stock en el frontend
    return (articulos || []).filter((a) => a.es_servicio || a.cantidad_stock > 0);
  }

  async getArticulosConcepto(conceptoId: string) {
    // Si el concepto es compuesto, obtener sus artículos
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

  private async descontarInventario(
    conceptoId: string,
    articulosVenta: ArticuloVenta[],
    movimientoCajaId: string,
    usuarioId?: string,
  ) {
    const query = this.supabase.admin.query;

    // Obtener el empleado_id real del usuario autenticado
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
      
      // Verificar stock disponible y si es servicio
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

      // 1. Registrar movimiento de salida en inventario
      const insertData: any = {
        articulo_id: articulo.articulo_inventario_id,
        tipo: 'Salida',
        cantidad: articulo.cantidad,
        motivo: `Venta - Movimiento Caja #${movimientoCajaId}`,
        fecha: new Date().toISOString(),
      };

      // Solo incluir responsable_id si tenemos un valor válido
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

  async buscarEstudiantePorId(id: string) {
    const { data, error } = await this.supabase.admin.rpc('fn_buscar_estudiante_por_id', { p_id: id });
    if (error) {
      // Fallback si la función RPC no existe
      const sql = `
        SELECT 
          e.id, e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido,
          e.numero_documento, e.tipo_documento
        FROM estudiante e
        WHERE e.id = $1
      `;
      const { data: direct, error: errD } = await this.supabase.admin.query(sql, [id]);
      if (errD) throw new BadRequestException(errD.message);
      return direct && direct.length > 0 ? direct[0] : null;
    }
    return data && data.length > 0 ? data[0] : data;
  }

  async buscarEstudiantes(buscar: string) {
    const query = this.supabase.admin.query;
    const sql = `
      SELECT 
        e.id,
        e.primer_nombre,
        e.segundo_nombre,
        e.primer_apellido,
        e.segundo_apellido,
        e.numero_documento,
        e.tipo_documento,
        (
          SELECT json_build_object(
            'id', m.id,
            'grupo', json_build_object(
              'nombre', g.nombre,
              'grado', json_build_object('nombre', gr.nombre)
            )
          )
          FROM matricula m
          LEFT JOIN grupo g ON m.grupo_id = g.id
          LEFT JOIN grado gr ON g.grado_id = gr.id
          WHERE m.estudiante_id = e.id
          ORDER BY m.fecha_matricula DESC
          LIMIT 1
        ) as matricula
      FROM estudiante e
      WHERE e.estado = 'Activo'
        AND (
          e.primer_nombre ILIKE $1 
          OR e.primer_apellido ILIKE $1 
          OR e.numero_documento ILIKE $1
        )
      ORDER BY e.primer_apellido, e.primer_nombre
      LIMIT 20
    `;
    const { data, error } = await query(sql, [`%${buscar}%`]);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async buscarEmpleados(buscar: string) {
    const query = this.supabase.admin.query;
    const sql = `
      SELECT 
        id,
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        numero_documento,
        cargo
      FROM empleado
      WHERE 
        primer_nombre ILIKE $1 OR 
        primer_apellido ILIKE $1 OR 
        numero_documento ILIKE $1
      LIMIT 10
    `;
    const { data, error } = await query(sql, [`%${buscar}%`]);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ======================
  // GENERAR NÚMERO DE COMPROBANTE
  // ======================
  async generarNumeroComprobante(): Promise<string> {
    console.log('=== generarNumeroComprobante llamado ===');
    const query = this.supabase.admin.query;
    const fecha = new Date();
    const prefijo = `REC-${fecha.getFullYear()}`;
    console.log('Prefijo:', prefijo);

    // Obtener el último número de comprobante del año
    const sql = `
      SELECT MAX(CAST(SUBSTRING(numero_comprobante FROM '[0-9]+$') AS INTEGER)) as ultimo
      FROM movimiento_caja 
      WHERE numero_comprobante LIKE $1
    `;
    console.log('SQL generarNumeroComprobante:', sql);
    const { data, error } = await query(sql, [`${prefijo}-%`]);
    console.log('Resultado SQL:', { data, error });
    if (error) throw new BadRequestException(error.message);

    const ultimo = data?.[0]?.ultimo || 0;
    const nuevo = ultimo + 1;
    return `${prefijo}-${nuevo.toString().padStart(6, '0')}`;
  }

  // ======================
  // MOVIMIENTOS DE CAJA
  // ======================

  async getMovimientos(filtros: {
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo?: 'INGRESO' | 'EGRESO';
    concepto?: string;
  }) {
    const query = this.supabase.admin.query;

    let sql = `
      SELECT 
        mc.*,
        u.email as registrado_por_email,
        mc.detalles_json as conceptos_detalle
      FROM movimiento_caja mc
      LEFT JOIN users u ON mc.registrado_por = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filtros.fecha_desde) {
      sql += ` AND mc.fecha >= $${params.length + 1}`;
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      sql += ` AND mc.fecha <= $${params.length + 1}`;
      params.push(filtros.fecha_hasta);
    }
    if (filtros.tipo) {
      sql += ` AND mc.tipo = $${params.length + 1}`;
      params.push(filtros.tipo);
    }
    if (filtros.concepto) {
      sql += ` AND mc.concepto = $${params.length + 1}`;
      params.push(filtros.concepto);
    }

    sql += ` ORDER BY mc.fecha DESC, mc.created_at DESC`;

    const { data, error } = await query(sql, params);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async crearMovimiento(movimiento: MovimientoCaja, usuarioId?: string) {
    console.log('=== crearMovimiento llamado ===');
    console.log('Movimiento recibido:', JSON.stringify(movimiento, null, 2));
    console.log('Usuario ID:', usuarioId);

    // Validar que el monto sea positivo
    if (movimiento.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    // Generar número de comprobante para cualquier tipo de movimiento
    const numeroComprobante = await this.generarNumeroComprobante();

    const query = this.supabase.admin.query;

    // Insertar con SQL directo
    const sql = `
      INSERT INTO movimiento_caja (
        tipo,
        concepto,
        monto,
        fecha,
        observacion,
        estudiante_id,
        estudiante_nombre,
        numero_comprobante,
        registrado_por,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    const params = [
      movimiento.tipo,
      movimiento.concepto,
      movimiento.monto,
      movimiento.fecha,
      movimiento.observacion || null,
      movimiento.estudiante_id || null,
      movimiento.estudiante_nombre || null,
      numeroComprobante,
      usuarioId || null,
    ];

    const { data, error } = await query(sql, params);
    if (error) {
      console.error('=== ERROR SQL MOVIMIENTO CAJA ===');
      console.error('SQL:', sql);
      console.error('Params:', params);
      console.error('Error completo:', error);
      throw new BadRequestException(error.message);
    }

    const movimientoId = data?.[0]?.id;

    // Si hay artículos de inventario, descontar del stock
    if (
      movimiento.articulos &&
      movimiento.articulos.length > 0 &&
      movimientoId
    ) {
      try {
        await this.descontarInventario(
          movimiento.concepto,
          movimiento.articulos,
          movimientoId,
          usuarioId,
        );
      } catch (error) {
        console.error('Error al descontar inventario:', error);
        // No lanzamos error para no afectar el movimiento de caja ya creado
        // pero podríamos loguear o notificar
      }
    }

    // Buscar el correo del usuario para mostrar en el comprobante
    let usuarioEmail = null;
    if (usuarioId) {
      const { data: userData } = await this.supabase.admin
        .from('users')
        .select('email')
        .eq('id', usuarioId)
        .single();
      usuarioEmail = userData?.email || null;
    }

    return {
      message: 'Movimiento registrado',
      data: {
        ...data?.[0],
        registrado_por_email: usuarioEmail,
      },
    };
  }

  async eliminarMovimiento(id: string) {
    const { error } = await this.supabase.admin
      .from('movimiento_caja')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Movimiento eliminado' };
  }

  async actualizarObservacionMovimiento(id: string, observacion: string) {
    const { data, error } = await this.supabase.admin
      .from('movimiento_caja')
      .update({ observacion })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Movimiento no encontrado');
    return { message: 'Observación actualizada', data };
  }

  // ======================
  // RESUMEN Y REPORTES
  // ======================

  async getResumen(fecha_desde?: string, fecha_hasta?: string) {
    // Obtener movimientos del período
    const movimientos = await this.getMovimientos({ fecha_desde, fecha_hasta });

    // Calcular totales (convertir monto a número ya que puede venir como string)
    const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO');
    const egresos = movimientos.filter((m) => m.tipo === 'EGRESO');

    const totalIngresos = ingresos.reduce(
      (sum, m) => sum + (parseFloat(m.monto) || 0),
      0,
    );
    const totalEgresos = egresos.reduce(
      (sum, m) => sum + (parseFloat(m.monto) || 0),
      0,
    );

    // Agrupar por concepto
    const porConceptoIngreso = this.agruparPorConcepto(ingresos);
    const porConceptoEgreso = this.agruparPorConcepto(egresos);

    return {
      periodo: {
        desde: fecha_desde || 'Inicio',
        hasta: fecha_hasta || 'Hoy',
      },
      totales: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        balance: totalIngresos - totalEgresos,
        cantidad_ingresos: ingresos.length,
        cantidad_egresos: egresos.length,
      },
      por_concepto: {
        ingresos: porConceptoIngreso,
        egresos: porConceptoEgreso,
      },
      movimientos: movimientos.slice(0, 50), // Últimos 50 para el detalle
    };
  }

  async getReporteMensual(anio: number, mes: number) {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-31`;

    return this.getResumen(desde, hasta);
  }

  private agruparPorConcepto(movimientos: any[]) {
    const agrupado: Record<
      string,
      { concepto: string; monto: number; cantidad: number }
    > = {};

    for (const m of movimientos) {
      if (!agrupado[m.concepto]) {
        agrupado[m.concepto] = { concepto: m.concepto, monto: 0, cantidad: 0 };
      }
      agrupado[m.concepto].monto += parseFloat(m.monto) || 0;
      agrupado[m.concepto].cantidad += 1;
    }

    return Object.values(agrupado).sort((a, b) => b.monto - a.monto);
  }

  // ======================
  // UTILIDADES
  // ======================

  getConceptos() {
    return {
      ingresos: CONCEPTOS_INGRESO,
      egresos: CONCEPTOS_EGRESO,
    };
  }

  // ======================
  // FACTURACIÓN
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

  // El número de factura se genera automáticamente vía TRIGGER en la base de datos
  private async generarNumeroFactura(prefijo: string): Promise<string> {
    return ''; 
  }

  async getFacturasPendientesEstudiante(estudianteId: string) {
    const query = this.supabase.admin.query;
    
    // 1. Obtener facturas pendientes
    const sqlFacturas = `
      SELECT id, numero_factura, fecha_emision, total, observaciones 
      FROM factura 
      WHERE estudiante_id = $1 AND estado = 'Emitida'
      ORDER BY fecha_emision ASC
    `;
    
    const { data: facturas, error: errorFac } = await query(sqlFacturas, [estudianteId]);
    if (errorFac) throw new BadRequestException(errorFac.message);
    if (!facturas || facturas.length === 0) return { data: [] };

    // 2. Obtener detalles para todas las facturas encontradas
    const facturaIds = facturas.map(f => f.id);
    const sqlDetalles = `
      SELECT id, factura_id, descripcion, cantidad, valor_unitario, valor_iva, subtotal, concepto_cobro_id
      FROM factura_detalle
      WHERE factura_id = ANY($1)
    `;
    
    const { data: detalles, error: errorDet } = await query(sqlDetalles, [facturaIds]);
    if (errorDet) throw new BadRequestException(errorDet.message);

    // 3. Mapear detalles a sus facturas
    const facturaConDetalles = facturas.map(f => ({
      ...f,
      factura_detalle: (detalles || []).filter(d => d.factura_id === f.id)
    }));

    return { data: facturaConDetalles };
  }

  // ======================
  // TRANSACCIÓN UNIFICADA - PARTIDA DOBLE
  // ======================

  async crearTransaccion(
    dto: {
      tipo: 'INGRESO' | 'EGRESO';
      estudiante_id?: string;
      estudiante_nombre?: string;
      factura_id?: string;
      conceptos?: Array<{
        concepto_cobro_id?: string;
        articulo_inventario_id?: string;
        descripcion: string;
        cantidad: number;
        valor_unitario: number;
        valor_iva: number;
      }>;
      observaciones?: string;
      metodo_pago?: string;
    },
    usuarioId?: string,
  ) {
    console.log('=== crearTransaccion llamado ===');
    console.log('DTO:', JSON.stringify(dto, null, 2));

    // Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;
    if (dto.conceptos && dto.conceptos.length > 0) {
      for (const c of dto.conceptos) {
        subtotal += c.cantidad * c.valor_unitario;
        ivaTotal += c.cantidad * c.valor_iva;
      }
    }
    const total = subtotal + ivaTotal;
    let factura: any = null;
    let facturaId: string | null = null;

    // 3. Crear MOVIMIENTO DE CAJA (para ambos: INGRESO y EGRESO)
    const numeroComprobante = await this.generarNumeroComprobante();

    // ===== INGRESO: Crear FACTURA + MOVIMIENTO =====
    if (dto.tipo === 'INGRESO' && dto.conceptos && dto.conceptos.length > 0) {
      if (dto.factura_id) {
        // 1. Pagar factura existente
        const sqlUpdate = `
          UPDATE factura 
          SET estado = 'Pagada', 
              monto_pagado = $1, 
              fecha_pago = $2 
          WHERE id = $3 
          RETURNING *
        `;
        const { data: resUpdate, error: errorFactura } = await this.supabase.admin.query(sqlUpdate, [
          total,
          new Date().toISOString().split('T')[0],
          dto.factura_id
        ]);

        if (errorFactura) throw new BadRequestException(`Error al actualizar factura: ${errorFactura.message}`);
        factura = resUpdate?.[0];
        facturaId = factura?.id;

        // 2. Crear registro en la tabla de PAGOS (para el Dashboard)
        await this.supabase.admin.from('pago').insert({
          factura_id: facturaId,
          estudiante_id: dto.estudiante_id,
          monto: total,
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: dto.metodo_pago || 'EFECTIVO',
          referencia: `Recibo ${numeroComprobante}`
        });

        // 3. Actualizar CARTERA (bajar la deuda)
        await this.supabase.admin
          .from('cartera')
          .update({ 
            saldo_pendiente: 0, 
            estado: 'Al día',
            ultima_actualizacion: new Date().toISOString()
          })
          .eq('estudiante_id', dto.estudiante_id);

        // El inventario se descuenta automáticamente vía TRIGGER en la DB
        // al crear el movimiento contable/caja.
      } else {
        // 1. Obtener acudiente del estudiante (necesario para factura)
        let acudienteId: string | null = null;
        if (dto.estudiante_id) {
          const { data: acudienteData } = await this.supabase.admin
            .from('estudiante_acudiente')
            .select('acudiente_id')
            .eq('estudiante_id', dto.estudiante_id)
            .order('es_principal', { ascending: false }) // Priorizar el principal
            .limit(1)
            .single();
          
          acudienteId = acudienteData?.acudiente_id || null;
        }

        // 2. Crear FACTURA nueva
        const prefijo = 'FAC';
        const numeroFactura = await this.generarNumeroFactura(prefijo);

        const { data: facturaCreada, error: errorFactura } =
          await this.supabase.admin
            .from('factura')
            .insert({
              prefijo,
              numero_factura: numeroFactura,
              fecha_emision: new Date().toISOString().split('T')[0],
              subtotal,
              descuento_total: 0,
              iva_total: ivaTotal,
              total,
              estado: 'Pagada',  // Se paga de inmediato al registrar en Caja
              monto_pagado: total,
              fecha_pago: new Date().toISOString().split('T')[0],
              acudiente_id: acudienteId,
              estudiante_id: dto.estudiante_id,
              observaciones: dto.observaciones,
            })
            .select()
            .single();

        if (errorFactura) throw new BadRequestException(`Error al crear factura: ${errorFactura.message}`);
        factura = facturaCreada;
        facturaId = facturaCreada.id;

        // 3. Crear DETALLES de factura nueva
        const detallesInsert = dto.conceptos.map((c) => ({
          factura_id: facturaId,
          cantidad: c.cantidad,
          valor_unitario: c.valor_unitario,
          valor_iva: c.valor_iva,
          subtotal: c.cantidad * c.valor_unitario,
          concepto_cobro_id: c.concepto_cobro_id,
          descripcion: c.descripcion,
        }));

        const { error: errorDetalles } = await this.supabase.admin
          .from('factura_detalle')
          .insert(detallesInsert);

        if (errorDetalles) {
          // Rollback: eliminar factura
          await this.supabase.admin.from('factura').delete().eq('id', facturaId);
          throw new BadRequestException(errorDetalles.message);
        }
      }
    }

    // 3. Crear MOVIMIENTO DE CAJA (para ambos: INGRESO y EGRESO)
    const query = this.supabase.admin.query;
    const sql = `
      INSERT INTO movimiento_caja (
        tipo,
        concepto,
        monto,
        fecha,
        observacion,
        estudiante_id,
        estudiante_nombre,
        numero_comprobante,
        registrado_por,
        factura_id,
        detalles_json,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;

    const params = [
      dto.tipo,
      factura && (factura as any).numero_factura
        ? `Factura ${(factura as any).numero_factura}`
        : dto.conceptos?.[0]?.descripcion || 'Movimiento',
      total,
      new Date().toISOString().split('T')[0],
      dto.observaciones || null,
      dto.estudiante_id || null,
      dto.estudiante_nombre || null,
      numeroComprobante,
      usuarioId || null,
      facturaId || null,
      JSON.stringify(dto.conceptos || []),
    ];

    const {
      data: movimiento,
      error: errorMovimiento,
    }: { data: any[] | null; error: any } = await query(sql, params);

    if (errorMovimiento) {
      // Rollback si es necesario
      if (facturaId) {
        await this.supabase.admin
          .from('factura_detalle')
          .delete()
          .eq('factura_id', facturaId);
        await this.supabase.admin.from('factura').delete().eq('id', facturaId);
      }
      throw new BadRequestException(errorMovimiento.message);
    }

    // Descontar inventario si aplica
    if (dto.tipo === 'INGRESO' && dto.conceptos) {
      const articulosVenta = dto.conceptos
        .filter((c) => c.articulo_inventario_id)
        .map((c) => ({
          articulo_inventario_id: c.articulo_inventario_id!,
          cantidad: c.cantidad,
        }));

      if (articulosVenta.length > 0) {
        try {
          await this.descontarInventario(
            'Venta - ' + ((factura as any)?.numero_factura || 'SIN-FACTURA'),
            articulosVenta,
            (movimiento as any[])?.[0]?.id,
            usuarioId,
          );
        } catch (error) {
          console.error('Error al descontar inventario:', error);
        }
      }
    }

    // Obtener email del usuario
    let usuarioEmail = null;
    if (usuarioId) {
      const { data: userData } = await this.supabase.admin
        .from('users')
        .select('email')
        .eq('id', usuarioId)
        .single();
      usuarioEmail = userData?.email || null;
    }

    return {
      message:
        dto.tipo === 'INGRESO'
          ? 'Ingreso registrado: Factura y Movimiento creados'
          : 'Egreso registrado: Movimiento creado',
      data: {
        factura,
        movimiento:
          movimiento && movimiento[0]
            ? {
                ...movimiento[0],
                registrado_por_email: usuarioEmail,
              }
            : null,
        comprobante: numeroComprobante,
        // Partida Doble - Representación contable dinámica
        partida_doble: {
          debe:
            dto.tipo === 'INGRESO'
              ? [
                  {
                    cuenta:
                      (dto as any).conceptos?.[0]?.cuenta_debito?.codigo ||
                      '1105 (Caja)',
                    valor: total,
                  },
                ]
              : [
                  {
                    cuenta:
                      (dto as any).conceptos?.[0]?.cuenta_debito?.codigo ||
                      '5105 (Gasto)',
                    valor: total,
                  },
                ],
          haber:
            dto.tipo === 'INGRESO'
              ? [
                  {
                    cuenta:
                      (dto as any).conceptos?.[0]?.cuenta_credito?.codigo ||
                      '4105 (Ingreso)',
                    valor: total,
                  },
                ]
              : [
                  {
                    cuenta:
                      (dto as any).conceptos?.[0]?.cuenta_credito?.codigo ||
                      '1105 (Caja)',
                    valor: total,
                  },
                ],
        },
      },
    };
  }
}
