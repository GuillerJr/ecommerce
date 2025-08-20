/**
 * @fileoverview Define los tipos de datos para la sección `infoFactura` del
 * comprobante electrónico, que contiene la información del comprador y los totales.
 */

/**
 * @type {TotalWithTax}
 * Define la estructura para un total de un impuesto específico (ej. total de IVA 12%).
 * @property {"2"} codigo - Código del impuesto (2: IVA).
 * @property {string} codigoPorcentaje - Código de la tarifa del impuesto (ej. '2' para IVA 12%).
 * @property {string} baseImponible - La base imponible para este impuesto.
 * @property {string} valor - El valor total calculado para este impuesto.
 */
export type TotalWithTax = {
  codigo: "2"; // Solo IVA
  codigoPorcentaje: "0" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  baseImponible: string;
  valor: string;
};

/**
 * @type {TotalWithTaxes}
 * Contenedor para los diferentes totales de impuestos.
 */
export type TotalWithTaxes = {
  totalImpuesto: TotalWithTax[];
};

/**
 * @type {Payment}
 * Define una forma de pago.
 * @property {string} formaPago - Código de la forma de pago (ej. '20' para "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO").
 * @property {string} total - El monto pagado con esta forma.
 */
export type Payment = {
  formaPago: string; // ej. 20 para Tarjeta de Credito
  total: string;
};

/**
 * @type {Payments}
 * Contenedor para las formas de pago.
 */
export type Payments = {
  pago: Payment[];
};


/**
 * @type {InvoiceInfo}
 * Estructura principal de la información de la factura.
 * @property {string} fechaEmision - Fecha de emisión en formato dd/mm/aaaa.
 * @property {string} dirEstablecimiento - Dirección del establecimiento emisor.
 * @property {"SI" | "NO"} obligadoContabilidad - Indica si el emisor está obligado a llevar contabilidad.
 * @property {string} tipoIdentificacionComprador - Código del tipo de identificación del comprador (04 RUC, 05 Cédula, 07 Consumidor Final).
 * @property {string} razonSocialComprador - Nombre o razón social del comprador.
 * @property {string} identificacionComprador - Número de identificación del comprador.
 * @property {string} totalSinImpuestos - Suma de todos los `precioTotalSinImpuesto` de los detalles.
 * @property {string} totalDescuento - Suma de todos los descuentos.
 * @property {TotalWithTaxes} totalConImpuestos - Objeto que desglosa los totales por cada tipo de impuesto.
 * @property {string} propina - Valor de la propina, usualmente "0.00".
 * @property {string} importeTotal - El valor final de la factura (totalSinImpuestos - totalDescuento + totalImpuestos + propina).
 * @property {string} moneda - Moneda utilizada, generalmente "DOLAR".
 * @property {Payments} pagos - Bloque que detalla la forma de pago.
 */
export type InvoiceInfo = {
  fechaEmision: string;
  dirEstablecimiento: string;
  obligadoContabilidad: "SI" | "NO";
  tipoIdentificacionComprador: "04" | "05" | "06" | "07" | "08";
  razonSocialComprador: string;
  identificacionComprador: string;
  totalSinImpuestos: string;
  totalDescuento: string;
  totalConImpuestos: TotalWithTaxes;
  propina: string;
  importeTotal: string;
  moneda: string;
  pagos: Payments;
};
