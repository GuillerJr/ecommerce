/**
 * @fileoverview Archivo de entrada principal para la librería `open-factura`.
 * Este archivo exporta todas las funciones, tipos y utilidades necesarios
 * para generar, firmar y enviar facturas electrónicas al SRI.
 * Actúa como la fachada pública de la librería, simplificando las importaciones
 * en otros módulos de la aplicación.
 */

export { documentAuthorization } from "./services/authorization";
export { generateInvoice, generateInvoiceXml } from "./services/generateInvoice";
export { documentReception } from "./services/reception";
export { signXml } from "./services/signing";
