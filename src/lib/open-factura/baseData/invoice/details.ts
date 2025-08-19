/**
 * @fileoverview Define la estructura para los detalles de los productos o servicios
 * en una factura electrónica, incluyendo impuestos y detalles adicionales por ítem.
 */

/**
 * @type {AdditionalDetail}
 * Define un detalle adicional para un ítem específico de la factura.
 * @property {"@nombre"} string - El nombre del detalle (ej. "Número de Serie").
 * @property {"@valor"} string - El valor del detalle (ej. "SN12345").
 */
export type AdditionalDetail = {
  "@nombre": string;
  "@valor": string;
};

/**
 * @type {AdditionalDetails}
 * Contenedor para una lista de detalles adicionales de un ítem.
 * @property {AdditionalDetail[]} detAdicional - Array de detalles adicionales.
 */
export type AdditionalDetails = {
  detAdicional: AdditionalDetail[];
};

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
  codigo: string;
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
 * @property {string} [codigoAuxiliar] - Un código auxiliar o secundario.
 * @property {string} descripcion - La descripción del producto.
 * @property {string} cantidad - La cantidad de unidades vendidas.
 * @property {string} precioUnitario - El precio por unidad, sin impuestos.
 * @property {string} descuento - El valor total del descuento para este ítem.
 * @property {string} precioTotalSinImpuesto - El precio total del ítem sin impuestos (cantidad * precioUnitario - descuento).
 * @property {AdditionalDetails} [detallesAdicionales] - Detalles adicionales para este ítem.
 * @property {Taxes} impuestos - Los impuestos aplicables a este ítem.
 */
export type Detail = {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  unidadMedida?: string;
  cantidad: string;
  precioUnitario: string;
  precioSinSubsidio?: string;
  descuento: string;
  precioTotalSinImpuesto: string;
  detallesAdicionales?: AdditionalDetails;
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
