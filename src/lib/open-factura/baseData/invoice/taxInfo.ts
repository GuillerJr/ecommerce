/**
 * @fileoverview Define la estructura para la `infoTributaria` de un comprobante electrónico,
 * que contiene la información básica del emisor y del documento.
 */

/**
 * @type {TaxInfo}
 * Estructura de la información tributaria.
 * @property {"1" | "2"} ambiente - Tipo de ambiente (1: Pruebas, 2: Producción).
 * @property {"1"} tipoEmision - Tipo de emisión (siempre '1' para Normal).
 * @property {string} razonSocial - Razón social del emisor.
 * @property {string} nombreComercial - Nombre comercial del emisor.
 * @property {string} ruc - RUC del emisor.
 * @property {string} claveAcceso - Clave de acceso de 49 dígitos, generada automáticamente.
 * @property {"01" | "03" | "04" | "05" | "06" | "07"} codDoc - Código del documento (01: Factura).
 * @property {string} estab - Código del establecimiento (ej. "001").
 * @property {string} ptoEmi - Código del punto de emisión (ej. "001").
 * @property {string} secuencial - Número secuencial de 9 dígitos (ej. "000000123").
 * @property {string} dirMatriz - Dirección de la matriz del emisor.
 */
export type TaxInfo = {
  ambiente: "1" | "2";
  tipoEmision: "1";
  razonSocial: string;
  nombreComercial: string;
  ruc: string;
  claveAcceso: string;
  codDoc: "01" | "03" | "04" | "05" | "06" | "07";
  estab: string;
  ptoEmi: string;
  secuencial: string;
  dirMatriz: string;
  regimenMicroempresas?: "CONTRIBUYENTE RÉGIMEN MICROEMPRESAS";
  agenteRetencion?: string;
  contribuyenteRimpe?:
    | "CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE"
    | "CONTRIBUYENTE RÉGIMEN RIMPE";
};