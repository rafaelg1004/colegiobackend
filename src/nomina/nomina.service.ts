import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateEmpleadoDto, UpdateEmpleadoDto,
  CreateNominaDto, LiquidarNominaMasivaDto, CreateNovedadDto,
} from './dto/nomina.dto';

@Injectable()
export class NominaService {
  constructor(private supabase: SupabaseService) {}

  // ======================
  // EMPLEADOS
  // ======================

  async crearEmpleado(dto: CreateEmpleadoDto) {
    const { data: existe } = await this.supabase.admin
      .from('empleado')
      .select('id')
      .eq('numero_documento', dto.numero_documento)
      .single();

    if (existe) throw new ConflictException('Ya existe un empleado con ese documento');

    const { data, error } = await this.supabase.admin
      .from('empleado')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Empleado creado', data };
  }

  async getEmpleados(filtros: { cargo?: string; estado?: string; buscar?: string }) {
    let qb = this.supabase.admin
      .from('empleado')
      .select('*')
      .order('primer_apellido');

    if (filtros.cargo) qb = qb.eq('cargo', filtros.cargo);
    if (filtros.estado) qb = qb.eq('estado', filtros.estado);
    if (filtros.buscar) {
      qb = qb.or(
        `primer_nombre.ilike.%${filtros.buscar}%,primer_apellido.ilike.%${filtros.buscar}%,numero_documento.ilike.%${filtros.buscar}%`,
      );
    }

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getEmpleado(id: string) {
    const { data, error } = await this.supabase.admin
      .from('empleado')
      .select(`
        *,
        asignacion_docente(
          asignatura:asignatura_id(nombre),
          grupo:grupo_id(nombre, grado:grado_id(nombre)),
          es_director_grupo
        ),
        nomina(periodo_mes, periodo_anio, neto_a_pagar, estado),
        novedad_nomina(tipo, fecha_inicio, fecha_fin, dias, descripcion)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Empleado no encontrado');
    return data;
  }

  async updateEmpleado(id: string, dto: UpdateEmpleadoDto) {
    const { data, error } = await this.supabase.admin
      .from('empleado')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Empleado no encontrado');
    return { message: 'Empleado actualizado', data };
  }

  // ======================
  // NÓMINA
  // ======================

  async liquidarNomina(dto: CreateNominaDto) {
    // El trigger fn_calcular_nomina calcula automáticamente devengados, deducciones y neto
    const { data, error } = await this.supabase.admin
      .from('nomina')
      .insert(dto)
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new ConflictException('Ya existe nómina para este empleado en este periodo');
      }
      throw new BadRequestException(error.message);
    }

    return { message: 'Nómina liquidada', data };
  }

  async liquidarNominaMasiva(dto: LiquidarNominaMasivaDto) {
    // Obtener todos los empleados activos
    const { data: empleados } = await this.supabase.admin
      .from('empleado')
      .select('id, cargo')
      .eq('estado', 'Activo');

    if (!empleados || empleados.length === 0) {
      throw new BadRequestException('No hay empleados activos');
    }

    // Verificar cuáles ya tienen nómina en este periodo
    const { data: nominasExistentes } = await this.supabase.admin
      .from('nomina')
      .select('empleado_id')
      .eq('periodo_mes', dto.periodo_mes)
      .eq('periodo_anio', dto.periodo_anio);

    const idsConNomina = new Set((nominasExistentes || []).map((n) => n.empleado_id));
    const empleadosSinNomina = empleados.filter((e) => !idsConNomina.has(e.id));

    if (empleadosSinNomina.length === 0) {
      throw new BadRequestException('Todos los empleados ya tienen nómina en este periodo');
    }

    // Para cada empleado, obtener su salario base de la última nómina o usar uno predeterminado
    const nominasCreadas: any[] = [];
    let errores = 0;

    for (const emp of empleadosSinNomina) {
      // Buscar la última nómina de este empleado para tomar el salario base
      const { data: ultimaNomina } = await this.supabase.admin
        .from('nomina')
        .select('salario_base, auxilio_transporte')
        .eq('empleado_id', emp.id)
        .order('periodo_anio', { ascending: false })
        .order('periodo_mes', { ascending: false })
        .limit(1)
        .single();

      try {
        const resultado = await this.liquidarNomina({
          empleado_id: emp.id,
          periodo_mes: dto.periodo_mes,
          periodo_anio: dto.periodo_anio,
          salario_base: ultimaNomina?.salario_base || 0,
          auxilio_transporte: ultimaNomina?.auxilio_transporte || 0,
        });
        nominasCreadas.push(resultado.data);
      } catch {
        errores++;
      }
    }

    return {
      message: `Liquidación masiva: ${nominasCreadas.length} nóminas creadas, ${errores} errores`,
      total_liquidadas: nominasCreadas.length,
      total_errores: errores,
      empleados_sin_salario_previo: nominasCreadas.filter((n) => n.salario_base === 0).length,
    };
  }

  async getNominas(filtros: { mes?: string; anio?: string; empleado_id?: string; estado?: string }) {
    let qb = this.supabase.admin
      .from('nomina')
      .select(`
        *,
        empleado:empleado_id(primer_nombre, primer_apellido, numero_documento, cargo)
      `)
      .order('periodo_anio', { ascending: false })
      .order('periodo_mes', { ascending: false });

    if (filtros.mes) qb = qb.eq('periodo_mes', parseInt(filtros.mes));
    if (filtros.anio) qb = qb.eq('periodo_anio', parseInt(filtros.anio));
    if (filtros.empleado_id) qb = qb.eq('empleado_id', filtros.empleado_id);
    if (filtros.estado) qb = qb.eq('estado', filtros.estado);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getNominaDetalle(id: string) {
    const { data, error } = await this.supabase.admin
      .from('nomina')
      .select(`
        *,
        empleado:empleado_id(
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          numero_documento, cargo, tipo_contrato, eps, fondo_pensiones,
          cuenta_bancaria, banco, tipo_cuenta
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Nómina no encontrada');
    return data;
  }

  async marcarNominaPagada(id: string, fechaPago?: string) {
    const { data, error } = await this.supabase.admin
      .from('nomina')
      .update({
        estado: 'Pagada',
        fecha_pago: fechaPago || new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Nómina marcada como pagada', data };
  }

  async marcarNominasPagadasMasivo(mes: number, anio: number) {
    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase.admin
      .from('nomina')
      .update({ estado: 'Pagada', fecha_pago: hoy })
      .eq('periodo_mes', mes)
      .eq('periodo_anio', anio)
      .eq('estado', 'Liquidada')
      .select();

    if (error) throw new BadRequestException(error.message);
    return { message: `${(data || []).length} nóminas marcadas como pagadas`, data };
  }

  async updateNomina(id: string, dto: Partial<CreateNominaDto>) {
    const { data, error } = await this.supabase.admin
      .from('nomina')
      .update(dto)
      .eq('id', id)
      .neq('estado', 'Pagada') // No se puede editar una nómina ya pagada
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('No se puede editar una nómina ya pagada');
    return { message: 'Nómina actualizada', data };
  }

  // ======================
  // NOVEDADES
  // ======================

  async crearNovedad(dto: CreateNovedadDto) {
    const { data, error } = await this.supabase.admin
      .from('novedad_nomina')
      .insert(dto)
      .select(`
        *,
        empleado:empleado_id(primer_nombre, primer_apellido)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Novedad registrada', data };
  }

  async getNovedades(filtros: { empleado_id?: string; tipo?: string; mes?: string; anio?: string }) {
    let qb = this.supabase.admin
      .from('novedad_nomina')
      .select(`
        *,
        empleado:empleado_id(primer_nombre, primer_apellido, cargo)
      `)
      .order('fecha_inicio', { ascending: false });

    if (filtros.empleado_id) qb = qb.eq('empleado_id', filtros.empleado_id);
    if (filtros.tipo) qb = qb.eq('tipo', filtros.tipo);

    const { data, error } = await qb;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ======================
  // REPORTES NÓMINA
  // ======================

  async getResumenNomina(mes: number, anio: number) {
    const { data: nominas } = await this.supabase.admin
      .from('nomina')
      .select('*')
      .eq('periodo_mes', mes)
      .eq('periodo_anio', anio);

    if (!nominas || nominas.length === 0) {
      return { message: 'No hay nóminas para este periodo', data: null };
    }

    const totalDevengado = nominas.reduce((s, n) => s + (n.total_devengado || 0), 0);
    const totalDeducciones = nominas.reduce((s, n) => s + (n.total_deducciones || 0), 0);
    const totalNeto = nominas.reduce((s, n) => s + (n.neto_a_pagar || 0), 0);
    const totalSaludEmpresa = nominas.reduce((s, n) => s + (n.aporte_salud_empresa || 0), 0);
    const totalPensionEmpresa = nominas.reduce((s, n) => s + (n.aporte_pension_empresa || 0), 0);
    const totalArl = nominas.reduce((s, n) => s + (n.aporte_arl || 0), 0);
    const totalSena = nominas.reduce((s, n) => s + (n.aporte_sena || 0), 0);
    const totalIcbf = nominas.reduce((s, n) => s + (n.aporte_icbf || 0), 0);
    const totalCaja = nominas.reduce((s, n) => s + (n.aporte_caja || 0), 0);

    return {
      periodo: `${mes}/${anio}`,
      total_empleados: nominas.length,
      pagadas: nominas.filter((n) => n.estado === 'Pagada').length,
      pendientes: nominas.filter((n) => n.estado !== 'Pagada').length,
      resumen: {
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        total_neto_pagar: totalNeto,
      },
      aportes_patronales: {
        salud: totalSaludEmpresa,
        pension: totalPensionEmpresa,
        arl: totalArl,
        sena: totalSena,
        icbf: totalIcbf,
        caja_compensacion: totalCaja,
        total: totalSaludEmpresa + totalPensionEmpresa + totalArl + totalSena + totalIcbf + totalCaja,
      },
      costo_total_empresa: totalNeto + totalSaludEmpresa + totalPensionEmpresa + totalArl + totalSena + totalIcbf + totalCaja,
    };
  }
}
