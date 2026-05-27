import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CajaInventarioService } from './caja-inventario.service';
import { MovimientoCaja } from '../interfaces';

@Injectable()
export class CajaMovimientoService {
  constructor(
    private supabase: SupabaseService,
    private cajaInventario: CajaInventarioService,
  ) {}

  async generarNumeroComprobante(): Promise<string> {
    console.log('=== generarNumeroComprobante llamado ===');
    const query = this.supabase.admin.query;
    const fecha = new Date();
    const prefijo = `REC-${fecha.getFullYear()}`;
    console.log('Prefijo:', prefijo);

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

    if (movimiento.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    const numeroComprobante = await this.generarNumeroComprobante();
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
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;

    const params = [
      movimiento.tipo,
      movimiento.concepto,
      movimiento.monto,
      movimiento.fecha,
      movimiento.observacion || null,
      movimiento.estudiante_id || null,
      movimiento.empleado_id || null,
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

    if (
      movimiento.articulos &&
      movimiento.articulos.length > 0 &&
      movimientoId
    ) {
      try {
        if (movimiento.tipo === 'INGRESO') {
          await this.cajaInventario.descontarInventario(
            movimiento.concepto,
            movimiento.articulos,
            movimientoId,
            usuarioId,
          );
        } else if (movimiento.tipo === 'EGRESO') {
          await this.cajaInventario.aumentarInventario(
            movimiento.concepto,
            movimiento.articulos,
            movimientoId,
            usuarioId,
          );
        }
      } catch (error) {
        console.error('Error al actualizar inventario:', error);
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

  async actualizarMovimiento(id: string, dto: { observacion?: string; fecha?: string }) {
    const { data: existente, error: errExistente } = await this.supabase.admin
      .from('movimiento_caja')
      .select('*')
      .eq('id', id)
      .single();

    if (errExistente || !existente) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    const updateData: any = {};
    if (dto.observacion !== undefined) updateData.observacion = dto.observacion;
    if (dto.fecha !== undefined) updateData.fecha = dto.fecha;

    if (dto.fecha && existente.factura_id) {
      try {
        await this.supabase.admin
          .from('factura')
          .update({ 
            fecha_emision: dto.fecha,
            fecha_pago: dto.fecha
          })
          .eq('id', existente.factura_id);
          
        await this.supabase.admin
          .from('pago')
          .update({ 
            fecha_pago: dto.fecha
          })
          .eq('factura_id', existente.factura_id);
      } catch (e) {
        console.error('Error al actualizar fecha de factura/pago asociada:', e);
      }
    }

    const { data, error } = await this.supabase.admin
      .from('movimiento_caja')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Movimiento actualizado', data };
  }

  async actualizarObservacionMovimiento(id: string, observacion: string) {
    return this.actualizarMovimiento(id, { observacion });
  }
}
