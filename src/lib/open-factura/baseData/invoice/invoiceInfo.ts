/**
 * @fileoverview Define los tipos de datos para la sección `infoFactura` del
 * comprobante electrónico, que contiene la información del comprador y los totales.
 */

/**
 * @type {InvoiceInfo}
 * Estructura principal de la información de la factura.
 * @property {string} fechaEmision - Fecha de emisión en formato dd/mm/aaaa.
 * @property {string} dirEstablecimiento - Dirección del establecimiento emisor.
 * @property {string} [contribuyenteEspecial] - Código de contribuyente especial, si aplica.
 * @property {"SI" | "NO"} obligadoContabilidad - Indica si el emisor está obligado a llevar contabilidad.
 * @property {string} tipoIdentificacionComprador - Código del tipo de identificación del comprador (04 RUC, 05 Cédula, 07 Consumidor Final).
 * @property {string} razonSocialComprador - Nombre o razón social del comprador.
 * @property {string} identificacionComprador - Número de identificación del comprador.
 * @property {string} [direccionComprador] - Dirección del comprador.
 * @property {string} totalSinImpuestos - Suma de todos los `precioTotalSinImpuesto` de los detalles.
 * @property {string} totalDescuento - Suma de todos los descuentos.
 * @property {TotalWithTaxes} totalConImpuestos - Objeto que desglosa los totales por cada tipo de impuesto.
 * @property {string} [propina] - Valor de la propina, usualmente "0.00".
 * @property {string} importeTotal - El valor final de la factura (totalSinImpuestos - totalDescuento + totalImpuestos + propina).
 * @property {string} moneda - Moneda utilizada, generalmente "DOLAR".
 * @property {Payments} pagos - Bloque que detalla la forma de pago.
 */
export type InvoiceInfo = {
  fechaEmision: string;
  dirEstablecimiento: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: "SI" | "NO";
  comercioExterior?: string;
  incoTermFactura?: string;
  lugarIncoTerm?: string;
  paisOrigen?: string;
  puertoEmbarque?: string;
  puertoDestino?: string;
  paisDestino?: string;
  paisAdquisicion?: string;
  tipoIdentificacionComprador: "04" | "05" | "06" | "07" | "08";
  guiaRemision?: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  direccionComprador?: string;
  totalSinImpuestos: string;
  totalSubsidio?: string;
  incoTermTotalSinImpuestos?: string;
  totalDescuento: string;
  codDocReembolso?: string;
  totalComprobantesReembolso?: string;
  totalBaseImponibleReembolso?: string;
  totalImpuestoReembolso?: string;
  totalConImpuestos: TotalWithTaxes;
  compensaciones?: Compensations;
  propina: string;
  fleteInternacional?: string;
  seguroInternacional?: string;
  gastosAduaneros?: string;
  gastosTransporteOtros?: string;
  importeTotal: string;
  moneda: string;
  placa?: string;
  pagos: Payments;
  valorRetIva?: string;
  valorRetRenta?: string;
};

/**
 * @type {TotalWithTax}
 * Define la estructura para un total de un impuesto específico (ej. total de IVA 12%).
 * @property {"2" | "3" | "5"} codigo - Código del impuesto (2: IVA, 3: ICE, 5: IRBPNR).
 * @property {string} codigoPorcentaje - Código de la tarifa del impuesto (ej. '2' para IVA 12%, '0' para IVA 0%).
 * @property {string} baseImponible - La base imponible para este impuesto.
 * @property {string} valor - El valor total calculado para este impuesto.
 */
export type TotalWithTax = {
  codigo: "2" | "3" | "5";
  codigoPorcentaje: "0" | "2" | "3" | "4" | "6" | "7" | "8";
  descuentoAdicional?: string;
  baseImponible: string;
  tarifa?: string;
  valor: string;
  valorDevolucionIva?: string;
};

/**
 * @type {TotalWithTaxes}
 * Contenedor para los diferentes totales de impuestos.
 */
export type TotalWithTaxes = {
  totalImpuesto: TotalWithTax[];
};

export type Compensation = {
  codigo: string;
  tarifa: string;
  valor: string;
};

export type Compensations = {
  compensacion: Compensation[];
};

/**
 * @type {Payment}
 * Define una forma de pago.
 * @property {string} formaPago - Código de la forma de pago (ej. '01' para "SIN UTILIZACION DEL SISTEMA FINANCIERO").
 * @property {string} total - El monto pagado con esta forma.
 */
export type Payment = {
  formaPago: string;
  total: string;
  plazo?: string;
  unidadTiempo?: string;
};

/**
 * @type {Payments}
 * Contenedor para las formas de pago.
 */
export type Payments = {
  pago: Payment[];
};
