/**
 * @fileoverview Define las estructuras de datos para los reembolsos en una factura electrónica.
 * Esta sección es utilizada cuando una factura incluye el reembolso de gastos a terceros.
 */

/**
 * @type {TaxDetail}
 * Detalle de un impuesto específico dentro de un reembolso.
 */
export type TaxDetail = {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: string;
  baseImponibleReembolso: string;
  impuestoReembolso: string;
};

/**
 * @type {TaxDetails}
 * Contenedor para los detalles de impuestos de un reembolso.
 */
export type TaxDetails = {
  detalleImpuesto: TaxDetail[];
};

/**
 * @type {ReimbursementCompensation}
 * Define una compensación dentro de un reembolso.
 */
export type ReimbursementCompensation = {
  codigo: string;
  tarifa: string;
  valor: string;
};

/**
 * @type {ReimbursementCompensations}
 * Contenedor para las compensaciones de un reembolso.
 */
export type ReimbursementCompensations = {
  compensacionesReembolso: ReimbursementCompensation[];
};

/**
 * @type {ReimbursementDetail}
 * Estructura completa para un detalle de reembolso.
 */
export type ReimbursementDetail = {
  tipoIdentificacionProveedorReembolso: string;
  identificacionProveedorReembolso: string;
  codPaisPagoProveedorReembolso: string;
  tipoProveedorReembolso: string;
  codDocReembolso: string;
  estabDocReembolso: string;
  ptoEmiDocReembolso: string;
  secuencialDocReembolso: string;
  fechaEmisionDocReembolso: string;
  numeroautorizacionDocReemb: string;
  detalleImpuestos: TaxDetails;
  compensacionesReembolso?: ReimbursementCompensations;
};

/**
 * @type {Reimbursements}
 * Contenedor principal para la lista de todos los detalles de reembolso en la factura.
 */
export type Reimbursements = {
  reembolsoDetalle: ReimbursementDetail[];
};
