/**
 * @fileoverview Define la estructura para las retenciones en una factura electrónica.
 * Esta sección generalmente no se usa en facturas, sino en Comprobantes de Retención.
 */

/**
 * @type {Retention}
 * Define una retención individual.
 * @property {string} codigo - Código del impuesto retenido.
 * @property {string} codigoPorcentaje - Código del porcentaje de retención.
 * @property {string} tarifa - El porcentaje de retención.
 * @property {string} valor - El valor total retenido.
 */
export type Retention = {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: string;
  valor: string;
};

/**
 * @type {Retentions}
 * Contenedor para una lista de retenciones.
 */
export type Retentions = {
  retencion: Retention[];
};
