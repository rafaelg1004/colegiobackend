# Arquitectura Escalable para el Módulo de Compras y Cuentas por Pagar

Este documento ha sido creado para almacenar el contexto y las especificaciones técnicas sobre cómo el colegio debe escalar su sistema de compras cuando su volumen de transacciones y necesidades de auditoría crezcan (por ejemplo, compras masivas a proveedores, equipos de cómputo, dotaciones grandes).

Actualmente, el sistema maneja las compras menores (Suministros) como un **"Gasto de Contado"** o "Caja Menor", donde en un solo paso el dinero sale de la caja y los artículos entran al inventario. Sin embargo, para compras gigantescas, este proceso debe segregarse en tres módulos independientes por seguridad, control de presupuestos y auditoría.

---

## 1. Módulo de Compras (Órdenes de Compra)

En este módulo, **nadie toca el dinero de la caja ni altera el inventario todavía**. Es estrictamente un módulo de planificación y autorización.

### Flujo Técnico:
- El área encargada (ej. Coordinación) genera una **Orden de Compra (OC)**.
- La OC debe pasar por un flujo de aprobación (Pendiente -> Aprobada).
- **Tablas a crear:**
  - `orden_compra` (id, proveedor_id, fecha_emision, estado, total, elaborado_por, aprobado_por)
  - `orden_compra_detalle` (id, orden_compra_id, articulo_inventario_id, cantidad, precio_unitario, subtotal)

### Impacto Contable e Inventario:
- **Contabilidad:** NINGUNO. Aún no se debe nada ni se ha pagado nada.
- **Inventario:** NINGUNO. (Opcionalmente se puede manejar un "stock en tránsito" o "esperado", pero no afecta el disponible físico).

---

## 2. Módulo de Bodega/Inventario (Recepción de Mercancía)

Este paso ocurre cuando el camión del proveedor llega al colegio con los artículos físicos.

### Flujo Técnico:
- El jefe de bodega o encargado de inventario entra al sistema, busca la "Orden de Compra Aprobada" y registra la **Recepción**.
- Puede haber recepciones parciales (llegaron 100 pupitres hoy y los otros 100 llegan mañana).
- **Tablas afectadas:**
  - Inserción en `movimiento_inventario` (tipo: 'Entrada', relacionando el `orden_compra_id`).
  - Actualización del estado de la `orden_compra` a "Recibida Parcial" o "Recibida Total".
  - Se genera automáticamente un documento de **Cuenta por Pagar** al proveedor (CXP).

### Impacto Contable e Inventario:
- **Inventario:** AUMENTA el stock físico disponible en el colegio de forma inmediata.
- **Contabilidad:** Se genera la causación (Partida Doble automática):
  - **DÉBITO:** Cuenta de Inventario (ej. 1435) o Gasto.
  - **CRÉDITO:** Cuenta de Pasivo / Cuentas por Pagar a Proveedores (ej. 2205).
  - *Nota: Todavía no ha salido un solo peso de la caja.*

---

## 3. Módulo de Tesorería (Pagos y Egresos)

Este módulo es manejado por el Tesorero o Pagador días, semanas o meses después de que la mercancía fue recibida, dependiendo de los términos de crédito con el proveedor (ej. pago a 30 días).

### Flujo Técnico:
- El Tesorero entra a su panel de "Cuentas por Pagar".
- Selecciona la deuda del proveedor generada en el paso 2 y autoriza el pago.
- Se selecciona de dónde saldrá el dinero (Caja General, Banco X, Banco Y).
- Se genera un **EGRESO** oficial en el sistema.

### Impacto Contable e Inventario:
- **Inventario:** NINGUNO. (El inventario ya entró en el paso 2).
- **Caja/Bancos:** Se registra la salida del dinero (`movimiento_caja` o `movimiento_bancario`).
- **Contabilidad:** Se cruza la deuda (Partida Doble automática):
  - **DÉBITO:** Cuenta de Pasivo / Cuentas por Pagar (ej. 2205) para cancelar la deuda.
  - **CRÉDITO:** Cuenta de Caja o Bancos (ej. 1105 / 1110) reflejando la salida del dinero.

---

## Beneficios de esta Arquitectura Futura (Escalabilidad)

1. **Segregación de Funciones:** El que compra no es el que recibe, y el que recibe no es el que paga. Esto evita fraudes (ej. pagar algo que nunca llegó a la bodega).
2. **Auditoría Clara:** Si falta un computador, se sabe qué día se autorizó, qué día llegó físicamente y qué día se le pagó al proveedor.
3. **Flujo de Caja Real:** Permite al colegio tener inventario hoy, pero proyectar el pago en el futuro, manteniendo liquidez.

## Nota para el Desarrollador (IA o Humano) que implemente esto:
- La estructura actual (compras por caja menor) se debe mantener intacta como una ruta rápida ("Fast-path") para compras menores que se hacen de contado en el mismo instante.
- El nuevo flujo masivo debe vivir en menús separados: `[Compras] -> [Órdenes]`, `[Bodega] -> [Recepciones]`, y `[Finanzas] -> [Cuentas por Pagar]`.
