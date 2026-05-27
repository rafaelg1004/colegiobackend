import { Injectable } from '@nestjs/common';
import { CajaInventarioService } from './services/caja-inventario.service';
import { CajaPersonaService } from './services/caja-persona.service';
import { CajaMovimientoService } from './services/caja-movimiento.service';
import { CajaReporteService } from './services/caja-reporte.service';
import { CajaFacturaService } from './services/caja-factura.service';
import { CajaTransaccionService } from './services/caja-transaccion.service';
import { MovimientoCaja } from './interfaces';

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

@Injectable()
export class CajaService {
  constructor(
    private cajaInventario: CajaInventarioService,
    private cajaPersona: CajaPersonaService,
    private cajaMovimiento: CajaMovimientoService,
    private cajaReporte: CajaReporteService,
    private cajaFactura: CajaFacturaService,
    private cajaTransaccion: CajaTransaccionService,
  ) {}

  async getConceptos() {
    return {
      ingresos: CONCEPTOS_INGRESO,
      egresos: CONCEPTOS_EGRESO,
    };
  }

  async getConceptosCobro() {
    return this.cajaInventario.getConceptosCobro();
  }

  async getArticulosPorCategoria(categoriaId: string) {
    return this.cajaInventario.getArticulosPorCategoria(categoriaId);
  }

  async getArticulosConcepto(conceptoId: string) {
    return this.cajaInventario.getArticulosConcepto(conceptoId);
  }

  async buscarEstudiantePorId(id: string) {
    return this.cajaPersona.buscarEstudiantePorId(id);
  }

  async buscarEstudiantes(buscar: string) {
    return this.cajaPersona.buscarEstudiantes(buscar);
  }

  async buscarEmpleados(buscar: string) {
    return this.cajaPersona.buscarEmpleados(buscar);
  }

  async generarNumeroComprobante() {
    return this.cajaMovimiento.generarNumeroComprobante();
  }

  async getMovimientos(filtros: {
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo?: 'INGRESO' | 'EGRESO';
    concepto?: string;
  }) {
    return this.cajaMovimiento.getMovimientos(filtros);
  }

  async crearMovimiento(movimiento: MovimientoCaja, usuarioId?: string) {
    return this.cajaMovimiento.crearMovimiento(movimiento, usuarioId);
  }

  async eliminarMovimiento(id: string) {
    return this.cajaMovimiento.eliminarMovimiento(id);
  }

  async actualizarMovimiento(id: string, dto: { observacion?: string; fecha?: string }) {
    return this.cajaMovimiento.actualizarMovimiento(id, dto);
  }

  async actualizarObservacionMovimiento(id: string, observacion: string) {
    return this.cajaMovimiento.actualizarObservacionMovimiento(id, observacion);
  }

  async getResumen(fecha_desde?: string, fecha_hasta?: string) {
    return this.cajaReporte.getResumen(fecha_desde, fecha_hasta);
  }

  async getReporteMensual(anio: number, mes: number) {
    return this.cajaReporte.getReporteMensual(anio, mes);
  }

  async getFacturas(filtros: {
    acudiente_id?: string;
    estudiante_id?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) {
    return this.cajaFactura.getFacturas(filtros);
  }

  async getFacturaById(id: string) {
    return this.cajaFactura.getFacturaById(id);
  }

  async crearFactura(dto: any, usuarioId?: string) {
    return this.cajaFactura.crearFactura(dto, usuarioId);
  }

  async anularFactura(id: string) {
    return this.cajaFactura.anularFactura(id);
  }

  async pagarFactura(id: string, montoPagado: number) {
    return this.cajaFactura.pagarFactura(id, montoPagado);
  }

  async getFacturasPendientesEstudiante(estudianteId: string) {
    return this.cajaFactura.getFacturasPendientesEstudiante(estudianteId);
  }

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
      }>;
      observaciones?: string;
      metodo_pago?: string;
      fecha?: string;
    },
    usuarioId?: string,
  ) {
    return this.cajaTransaccion.crearTransaccion(dto, usuarioId);
  }
}
