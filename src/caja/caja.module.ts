import { Module } from '@nestjs/common';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CajaInventarioService } from './services/caja-inventario.service';
import { CajaPersonaService } from './services/caja-persona.service';
import { CajaMovimientoService } from './services/caja-movimiento.service';
import { CajaReporteService } from './services/caja-reporte.service';
import { CajaFacturaService } from './services/caja-factura.service';
import { CajaTransaccionService } from './services/caja-transaccion.service';

@Module({
  controllers: [CajaController],
  providers: [
    CajaService,
    SupabaseService,
    CajaInventarioService,
    CajaPersonaService,
    CajaMovimientoService,
    CajaReporteService,
    CajaFacturaService,
    CajaTransaccionService,
  ],
  exports: [
    CajaService,
    CajaInventarioService,
    CajaPersonaService,
    CajaMovimientoService,
    CajaReporteService,
    CajaFacturaService,
    CajaTransaccionService,
  ],
})
export class CajaModule {}
