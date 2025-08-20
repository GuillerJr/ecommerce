/**
 * @fileoverview Define la estructura para los detalles de los productos o servicios
 * en una factura electrónica, incluyendo impuestos y detalles adicionales por ítem.
 */

/**
 * @type {Tax}
 * Define la estructura de un impuesto aplicable a un ítem de la factura.
 * @property {string} codigo - Código del tipo de impuesto (ej. '2' para IVA).
 * @property {string} codigoPorcentaje - Código del porcentaje del impuesto (ej. '2' para 12%).
 * @property {string} tarifa - El valor del porcentaje del impuesto (ej. "12.00").
 * @property {string} baseImponible - El monto sobre el cual se calcula el impuesto.
 * @property {string} valor - El valor total del impuesto calculado.
 */
export type Tax = {
  codigo: "2"; // Solo IVA
  codigoPorcentaje: string;
  tarifa: string;
  baseImponible: string;
  valor: string;
};

/**
 * @type {Taxes}
 * Contenedor para la lista de impuestos de un ítem.
 * @property {Tax[]} impuesto - Array de impuestos.
 */
export type Taxes = {
  impuesto: Tax[];
};

/**
 * @type {Detail}
 * Define la estructura completa para un ítem (producto o servicio) en la factura.
 * @property {string} codigoPrincipal - El código principal del producto (SKU).
 * @property {string} descripcion - La descripción del producto.
 * @property {string} cantidad - La cantidad de unidades vendidas.
 * @property {string} precioUnitario - El precio por unidad, sin impuestos.
 * @property {string} descuento - El valor total del descuento para este ítem.
 * @property {string} precioTotalSinImpuesto - El precio total del ítem sin impuestos (cantidad * precioUnitario - descuento).
 * @property {Taxes} impuestos - Los impuestos aplicables a este ítem.
 */
export type Detail = {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  precioTotalSinImpuesto: string;
  impuestos: Taxes;
};

/**
 * @type {Details}
 * Contenedor para todos los ítems de la factura.
 * @property {Detail[]} detalle - Un array de todos los ítems de la factura.
 */
export type Details = {
  detalle: Detail[];
};
