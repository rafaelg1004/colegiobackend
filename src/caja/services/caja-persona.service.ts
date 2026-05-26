import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CajaPersonaService {
  constructor(private supabase: SupabaseService) {}

  async buscarEstudiantePorId(id: string) {
    const { data, error } = await this.supabase.admin.rpc('fn_buscar_estudiante_por_id', { p_id: id });
    if (error) {
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
}
