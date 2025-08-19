/**
 * @fileoverview Archivo de entrada principal para la librería `open-factura`.
 * Este archivo exporta todas las funciones, tipos y utilidades necesarios
 * para generar, firmar y enviar facturas electrónicas al SRI.
 * Actúa como la fachada pública de la librería, simplificando las importaciones
 * en otros módulos de la aplicación.
 */

export { documentAuthorization } from "./services/authorization";
export {
  generateInvoice,
  generateInvoiceXml,
} from "./services/generateInvoice";
export { documentReception } from "./services/reception";
export {
  signXml,
  getP12FromLocalFile,
  getP12FromUrl,
  getXMLFromLocalFile,
  getXMLFromLocalUrl,
} from "./services/signing";
export {
  AdditionalInfo,
  AdditionalField,
} from "./baseData/invoice/additionalInfo";
export {
  Details,
  Detail,
  Taxes,
  Tax,
  AdditionalDetails,
  AdditionalDetail,
} from "./baseData/invoice/details";
export { InvoiceInput, Invoice } from "./baseData/invoice/invoice";
export {
  InvoiceInfo,
  TotalWithTax,
  TotalWithTaxes,
  Compensation,
  Compensations,
  Payment,
  Payments,
} from "./baseData/invoice/invoiceInfo";
export {
  ThirdPartyValue,
  OtherThirdPartyValues,
} from "./baseData/invoice/otherThirdPartyValues";
export {
  Reimbursements,
  ReimbursementDetail,
  ReimbursementCompensations,
  ReimbursementCompensation,
  TaxDetails,
  TaxDetail,
} from "./baseData/invoice/reimbursements";
export {
  RemisionGuideSustitutiveInfo,
  Arrivals,
  Arrival,
} from "./baseData/invoice/remissionGuidesSustitutiveInfo";
export { Retentions, Retention } from "./baseData/invoice/retentions";
export { TaxInfo } from "./baseData/invoice/taxInfo";
