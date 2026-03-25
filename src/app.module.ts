// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { AcudientesModule } from './acudientes/acudientes.module';
import { MatriculasModule } from './matriculas/matriculas.module';
import { CalificacionesModule } from './calificaciones/calificaciones.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { GruposModule } from './grupos/grupos.module';
import { FinancieroModule } from './financiero/financiero.module';
import { NominaModule } from './nomina/nomina.module';
import { InventarioModule } from './inventario/inventario.module';
import { ObservadorModule } from './observador/observador.module';
import { AcademicoModule } from './academico/academico.module';
import { ReportesModule } from './reportes/reportes.module';
import { ComunicacionModule } from './comunicacion/comunicacion.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { EvaluacionModule } from './evaluacion/evaluacion.module';
import { ContabilidadModule } from './contabilidad/contabilidad.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    EstudiantesModule,
    AcudientesModule,
    MatriculasModule,
    CalificacionesModule,
    AsistenciaModule,
    GruposModule,
    FinancieroModule,
    NominaModule,
    InventarioModule,
    ObservadorModule,
    AcademicoModule,
    ReportesModule,
    ComunicacionModule,
    ConfiguracionModule,
    EvaluacionModule,
    ContabilidadModule,
  ],
})
export class AppModule {}
