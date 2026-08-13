import { Injectable } from '@nestjs/common';
import { CajaMovimientoService } from './caja-movimiento.service';

@Injectable()
export class CajaReporteService {
  constructor(private cajaMovimiento: CajaMovimientoService) {}

  async getResumen(fecha_desde?: string, fecha_hasta?: string) {
    const movimientosRaw = await this.cajaMovimiento.getMovimientos({ fecha_desde, fecha_hasta });
    const movimientos = movimientosRaw.filter(
      (m) => !m.estado || (m.estado !== 'ANULADO' && m.estado !== 'anulado')
    );

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
      movimientos: movimientos,
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
}
