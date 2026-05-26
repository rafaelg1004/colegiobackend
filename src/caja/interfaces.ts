export interface MovimientoCaja {
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

export interface ArticuloVenta {
  articulo_inventario_id: string;
  cantidad: number;
  nombre?: string;
  precio_unitario?: number;
}
