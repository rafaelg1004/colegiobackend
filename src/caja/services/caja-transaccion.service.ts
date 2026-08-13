import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CajaMovimientoService } from './caja-movimiento.service';
import { CajaInventarioService } from './caja-inventario.service';
import { CajaFacturaService } from './caja-factura.service';

@Injectable()
export class CajaTransaccionService {
  constructor(
    private supabase: SupabaseService,
    private cajaMovimiento: CajaMovimientoService,
    private cajaInventario: CajaInventarioService,
    private cajaFactura: CajaFacturaService,
  ) {}

  async crearTransaccion(
    dto: {
      tipo: 'INGRESO' | 'EGRESO';
      estudiante_id?: string;
      empleado_id?: string;
      estudiante_nombre?: string;
      factura_id?: string;
      conceptos?: Array<{
        concepto_cobro_id?: string;
        articulo_inventario_id?: string;
        descripcion: string;
        cantidad: number;
        valor_unitario: number;
        valor_iva: number;
        cuenta_debito?: { codigo: string };
        cuenta_credito?: { codigo: string };
      }>;
      observaciones?: string;
      metodo_pago?: string;
      fecha?: string;
    },
    usuarioId?: string,
  ) {
    console.log('=== crearTransaccion llamado ===');
    console.log('DTO:', JSON.stringify(dto, null, 2));

    const fechaTransaccion = dto.fecha || new Date().toISOString().split('T')[0];

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

    const numeroComprobante = await this.cajaMovimiento.generarNumeroComprobante();

    if (dto.tipo === 'INGRESO' && dto.conceptos && dto.conceptos.length > 0) {
      if (dto.factura_id) {
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
          fechaTransaccion,
          dto.factura_id
        ]);

        if (errorFactura) throw new BadRequestException(`Error al actualizar factura: ${errorFactura.message}`);
        factura = resUpdate?.[0];
        facturaId = factura?.id;

        await this.supabase.admin.from('pago').insert({
          factura_id: facturaId,
          estudiante_id: dto.estudiante_id,
          monto: total,
          fecha_pago: fechaTransaccion,
          metodo_pago: dto.metodo_pago || 'EFECTIVO',
          referencia: `Recibo ${numeroComprobante}`
        });

        await this.supabase.admin
          .from('cartera')
          .update({ 
            saldo_pendiente: 0, 
            estado: 'Al día',
            ultima_actualizacion: new Date().toISOString()
          })
          .eq('estudiante_id', dto.estudiante_id);
      } else {
        let acudienteId: string | null = null;
        if (dto.estudiante_id) {
          const { data: acudienteData } = await this.supabase.admin
            .from('estudiante_acudiente')
            .select('acudiente_id')
            .eq('estudiante_id', dto.estudiante_id)
            .order('es_principal', { ascending: false })
            .limit(1)
            .single();
          
          acudienteId = acudienteData?.acudiente_id || null;
        }

        const prefijo = 'FAC';
        const numeroFactura = await this.cajaFactura.generarNumeroFactura(prefijo);

        const { data: facturaCreada, error: errorFactura } =
          await this.supabase.admin
            .from('factura')
            .insert({
              prefijo,
              numero_factura: numeroFactura,
              fecha_emision: fechaTransaccion,
              subtotal,
              descuento_total: 0,
              iva_total: ivaTotal,
              total,
              estado: 'Pagada',
              monto_pagado: total,
              fecha_pago: fechaTransaccion,
              acudiente_id: acudienteId,
              estudiante_id: dto.estudiante_id,
              observaciones: dto.observaciones,
            })
            .select()
            .single();

        if (errorFactura) throw new BadRequestException(`Error al crear factura: ${errorFactura.message}`);
        factura = facturaCreada;
        facturaId = facturaCreada.id;

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
          await this.supabase.admin.from('factura').delete().eq('id', facturaId);
          throw new BadRequestException(errorDetalles.message);
        }
      }
    }

    const query = this.supabase.admin.query;
    const sql = `
      INSERT INTO movimiento_caja (
        tipo,
        concepto,
        monto,
        fecha,
        observacion,
        estudiante_id,
        empleado_id,
        estudiante_nombre,
        numero_comprobante,
        registrado_por,
        factura_id,
        detalles_json,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `;

    const params = [
      dto.tipo,
      factura && (factura as any).numero_factura
        ? `Factura ${(factura as any).numero_factura}`
        : dto.conceptos?.[0]?.descripcion || 'Movimiento',
      total,
      fechaTransaccion,
      dto.observaciones || null,
      dto.estudiante_id || null,
      dto.empleado_id || null,
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
      if (facturaId) {
        await this.supabase.admin
          .from('factura_detalle')
          .delete()
          .eq('factura_id', facturaId);
        await this.supabase.admin.from('factura').delete().eq('id', facturaId);
      }
      throw new BadRequestException(errorMovimiento.message);
    }

    if (dto.conceptos) {
      const articulosTransaccion = dto.conceptos
        .filter((c) => c.articulo_inventario_id)
        .map((c) => ({
          articulo_inventario_id: c.articulo_inventario_id!,
          cantidad: c.cantidad,
        }));

      if (articulosTransaccion.length > 0) {
        try {
          if (dto.tipo === 'INGRESO') {
            await this.cajaInventario.descontarInventario(
              'Venta - ' + ((factura as any)?.numero_factura || 'SIN-FACTURA'),
              articulosTransaccion,
              (movimiento as any[])?.[0]?.id,
              usuarioId,
            );
          } else if (dto.tipo === 'EGRESO') {
            await this.cajaInventario.aumentarInventario(
              'Compra - ' + (dto.conceptos?.[0]?.descripcion || 'Varios'),
              articulosTransaccion,
              (movimiento as any[])?.[0]?.id,
              usuarioId,
            );
          }
        } catch (error) {
          console.error('Error al actualizar inventario:', error);
        }
      }
    }

    let usuarioEmail = null;
    if (usuarioId) {
      const { data: userData } = await this.supabase.admin
        .from('users')
        .select('email')
        .eq('id', usuarioId)
        .single();
      usuarioEmail = userData?.email || null;
    }

    // --- INTEGRACIÓN CONTABLE (PARTIDA DOBLE) ---
    const movimientosContables: any[] = [];
    const fechaActual = dto.fecha || new Date().toISOString().split('T')[0];
    const descripcionGeneral = `${dto.tipo}: ${dto.conceptos?.map(c => c.descripcion).join(', ') || 'Transacción de Caja'} - ${dto.estudiante_nombre || 'General'} (Ref: ${numeroComprobante})`;

    try {
      // Intentar obtener las cuentas de los conceptos o usar por defecto
      let cuentaDebitoId = (dto.conceptos?.[0] as any)?.cuenta_debito_id;
      let cuentaCreditoId = (dto.conceptos?.[0] as any)?.cuenta_credito_id;

      // Buscar IDs de cuentas por defecto si no vienen
      if (!cuentaDebitoId || !cuentaCreditoId) {
        const codigosBuscar: string[] = [];
        
        let cuentaIngresoPorDefecto = '4105'; // Matrículas por defecto
        let cuentaEgresoPorDefecto = '5105';  // Pagos Docentes por defecto

        if (dto.conceptos?.length) {
          const desc = dto.conceptos[0].descripcion.toLowerCase();
          
          // Consultar la tabla tgen_clasificacion_caja dinámicamente
          const { data: reglas } = await this.supabase.admin
            .from('tgen_clasificacion_caja')
            .select('*')
            .eq('tipo', dto.tipo);
            
          let matchCodigo = null;
          if (reglas) {
            for (const regla of reglas) {
              const palabras = regla.palabras_clave.split(',');
              if (palabras.some((p: string) => desc.includes(p.trim().toLowerCase()))) {
                matchCodigo = regla.cuenta_codigo;
                break;
              }
            }
          }

          if (dto.tipo === 'INGRESO') {
            if (matchCodigo) cuentaIngresoPorDefecto = matchCodigo;
            else if (!desc.includes('matricula') && !desc.includes('matrícula')) cuentaIngresoPorDefecto = '4140'; // Otras Actividades
          } else if (dto.tipo === 'EGRESO') {
            if (matchCodigo) cuentaEgresoPorDefecto = matchCodigo;
          }
        }

        if (!cuentaDebitoId) codigosBuscar.push(dto.tipo === 'INGRESO' ? '1105' : cuentaEgresoPorDefecto);
        if (!cuentaCreditoId) codigosBuscar.push(dto.tipo === 'INGRESO' ? cuentaIngresoPorDefecto : '1105');
        
        const { data: cuentasDefecto } = await this.supabase.admin
          .from('cuenta_contable')
          .select('id, codigo')
          .order('codigo');

        if (cuentasDefecto && cuentasDefecto.length > 0) {
          if (!cuentaDebitoId) {
            const codigoBuscado = dto.tipo === 'INGRESO' ? '1105' : cuentaEgresoPorDefecto;
            cuentaDebitoId = cuentasDefecto.find(c => c.codigo === codigoBuscado)?.id
              || cuentasDefecto.find(c => c.codigo.startsWith(codigoBuscado))?.id
              || cuentasDefecto.find(c => c.codigo.startsWith(dto.tipo === 'INGRESO' ? '11' : '5'))?.id;
          }
          if (!cuentaCreditoId) {
            const codigoBuscado = dto.tipo === 'INGRESO' ? cuentaIngresoPorDefecto : '1105';
            cuentaCreditoId = cuentasDefecto.find(c => c.codigo === codigoBuscado)?.id
              || cuentasDefecto.find(c => c.codigo.startsWith(codigoBuscado))?.id
              || cuentasDefecto.find(c => c.codigo.startsWith(dto.tipo === 'INGRESO' ? '4' : '11'))?.id;
          }
        }
      }

      // Si encontramos ambas cuentas, crear los asientos
      if (cuentaDebitoId && cuentaCreditoId) {
        // Asiento DEBE
        movimientosContables.push({
          descripcion: descripcionGeneral,
          fecha: fechaActual,
          debe: total,
          haber: 0,
          cuenta_contable_id: cuentaDebitoId,
          factura_id: facturaId || null,
          movimiento_caja_id: (movimiento as any[])?.[0]?.id || null,
        });

        // Asiento HABER
        movimientosContables.push({
          descripcion: descripcionGeneral,
          fecha: fechaActual,
          debe: 0,
          haber: total,
          cuenta_contable_id: cuentaCreditoId,
          factura_id: facturaId || null,
          movimiento_caja_id: (movimiento as any[])?.[0]?.id || null,
        });

        // Insertar en la BD
        await this.supabase.admin.from('movimiento_contable').insert(movimientosContables);
      }
    } catch (error) {
      console.error('Error al registrar partida doble en contabilidad:', error);
      // No lanzamos excepción para no bloquear la transacción de caja, pero queda en log
    }
    // --------------------------------------------

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
        partida_doble: {
          debe:
            dto.tipo === 'INGRESO'
              ? [
                  {
                    cuenta:
                      dto.conceptos?.[0]?.cuenta_debito?.codigo ||
                      '1105 (Caja)',
                    valor: total,
                  },
                ]
              : [
                  {
                    cuenta:
                      dto.conceptos?.[0]?.cuenta_debito?.codigo ||
                      '5105 (Gasto)',
                    valor: total,
                  },
                ],
          haber:
            dto.tipo === 'INGRESO'
              ? [
                  {
                    cuenta:
                      dto.conceptos?.[0]?.cuenta_credito?.codigo ||
                      '4105 (Ingreso)',
                    valor: total,
                  },
                ]
              : [
                  {
                    cuenta:
                      dto.conceptos?.[0]?.cuenta_credito?.codigo ||
                      '1105 (Caja)',
                    valor: total,
                  },
                ],
        },
      },
    };
  }
}
