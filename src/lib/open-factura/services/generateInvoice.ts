/**
 * @fileoverview Contiene las funciones para generar el objeto de factura y su representación en XML.
 */

import { create } from "xmlbuilder2";
import { Invoice, InvoiceInput } from "../baseData/invoice/invoice";
import { generateAccessKey } from "../utils/utils";

/**
 * Convierte un objeto de factura (en formato JavaScript) a una cadena de texto XML.
 * @param {Invoice} invoice - El objeto de factura completo.
 * @returns {string} Una cadena de texto con el contenido del archivo XML de la factura.
 */
export function generateInvoiceXml(invoice: Invoice) {
  const document = create(invoice);
  const xml = document.end({ prettyPrint: true });
  return xml;
}

/**
 * Genera el objeto de factura completo a partir de los datos de entrada.
 * Esta función también crea la clave de acceso de 49 dígitos requerida por el SRI.
 * @param {InvoiceInput} invoiceData - Los datos de entrada para la factura.
 * @returns {{ invoice: Invoice, accessKey: string }} Un objeto que contiene la factura completa y su clave de acceso.
 */
export function generateInvoice(invoiceData: InvoiceInput) {
  // Genera la clave de acceso de 49 dígitos.
  const accessKey = generateAccessKey({
    date: new Date(),
    codDoc: invoiceData.infoTributaria.codDoc,
    ruc: invoiceData.infoTributaria.ruc,
    environment: invoiceData.infoTributaria.ambiente,
    establishment: invoiceData.infoTributaria.estab,
    emissionPoint: invoiceData.infoTributaria.ptoEmi,
    sequential: invoiceData.infoTributaria.secuencial,
  });

  // Construye el objeto de factura final, añadiendo la clave de acceso a la información tributaria.
  const invoice: Invoice = {
    factura: {
      "@xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
      "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "@id": "comprobante",
      "@version": "1.0.0",
      infoTributaria: { ...invoiceData.infoTributaria, claveAcceso: accessKey },
      infoFactura: invoiceData.infoFactura,
      detalles: invoiceData.detalles,
    },
  };

  return { invoice, accessKey };
}
