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
function generateInvoiceXml(invoice: Invoice) {
  const document = create({ encoding: 'UTF-8' }, invoice);
  const xml = document.end({ prettyPrint: true });
  return xml;
}

/**
 * Genera el objeto de factura completo a partir de los datos de entrada.
 * Esta función también crea la clave de acceso de 49 dígitos requerida por el SRI.
 * @param {InvoiceInput} invoiceData - Los datos de entrada para la factura.
 * @returns {{ invoice: Invoice, accessKey: string, xml: string }} Un objeto que contiene la factura completa, su clave de acceso y el XML.
 */
export function generateInvoice(invoiceData: { factura: InvoiceInput }) {
  const accessKey = generateAccessKey({
    date: new Date(),
    codDoc: invoiceData.factura.infoTributaria.codDoc,
    ruc: invoiceData.factura.infoTributaria.ruc,
    environment: invoiceData.factura.infoTributaria.ambiente,
    establishment: invoiceData.factura.infoTributaria.estab,
    emissionPoint: invoiceData.factura.infoTributaria.ptoEmi,
    sequential: invoiceData.factura.infoTributaria.secuencial,
  });

  const infoTributaria: any = {
      ambiente: invoiceData.factura.infoTributaria.ambiente,
      tipoEmision: invoiceData.factura.infoTributaria.tipoEmision,
      razonSocial: invoiceData.factura.infoTributaria.razonSocial,
      ruc: invoiceData.factura.infoTributaria.ruc,
      claveAcceso: accessKey,
      codDoc: invoiceData.factura.infoTributaria.codDoc,
      estab: invoiceData.factura.infoTributaria.estab,
      ptoEmi: invoiceData.factura.infoTributaria.ptoEmi,
      secuencial: invoiceData.factura.infoTributaria.secuencial,
      dirMatriz: invoiceData.factura.infoTributaria.dirMatriz,
  };

  if (invoiceData.factura.infoTributaria.contribuyenteRimpe) {
      infoTributaria.contribuyenteRimpe = invoiceData.factura.infoTributaria.contribuyenteRimpe;
  }

  // Re-order for SRI compliance, placing claveAcceso after RUC
  const orderedInfoTributaria: any = {
      ambiente: infoTributaria.ambiente,
      tipoEmision: infoTributaria.tipoEmision,
      razonSocial: infoTributaria.razonSocial,
      ruc: infoTributaria.ruc,
      claveAcceso: infoTributaria.claveAcceso,
      codDoc: infoTributaria.codDoc,
      estab: infoTributaria.estab,
      ptoEmi: infoTributaria.ptoEmi,
      secuencial: infoTributaria.secuencial,
      dirMatriz: infoTributaria.dirMatriz,
  };

  if (infoTributaria.contribuyenteRimpe) {
      orderedInfoTributaria.contribuyenteRimpe = infoTributaria.contribuyenteRimpe;
  }


  const invoice: Invoice = {
    factura: {
      "@id": "comprobante",
      "@version": "1.1.0",
      infoTributaria: orderedInfoTributaria,
      infoFactura: invoiceData.factura.infoFactura,
      detalles: invoiceData.factura.detalles,
      ...(invoiceData.factura.infoAdicional && { infoAdicional: invoiceData.factura.infoAdicional }),
    },
  };

  const xml = generateInvoiceXml(invoice);

  return { invoice, accessKey, xml };
}
