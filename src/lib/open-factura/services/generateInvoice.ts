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
export function generateInvoiceXml(invoice: Invoice): string {
  const document = create({ encoding: 'UTF-8' }, invoice);
  const xml = document.end({ prettyPrint: true });
  return xml;
}


/**
 * Crea el objeto de factura completo, incluyendo la clave de acceso generada.
 * @param {InvoiceInput} invoiceData - Los datos de entrada para la factura.
 * @param {Date} emissionDate - La fecha de emisión para el comprobante.
 * @returns {{ invoice: Invoice, accessKey: string }} El objeto de factura y la clave de acceso.
 */
export function generateInvoice(
  invoiceData: InvoiceInput,
  emissionDate: Date
): { invoice: Invoice; accessKey: string } {
  const accessKey = generateAccessKey({
    date: emissionDate,
    codDoc: invoiceData.infoTributaria.codDoc,
    ruc: invoiceData.infoTributaria.ruc,
    environment: invoiceData.infoTributaria.ambiente,
    establishment: invoiceData.infoTributaria.estab,
    emissionPoint: invoiceData.infoTributaria.ptoEmi,
    sequential: invoiceData.infoTributaria.secuencial,
  });

  // Construir infoTributaria en el orden requerido por el XSD del SRI
  const it = invoiceData.infoTributaria;
  const infoTributariaOrdered: any = {
    ambiente: it.ambiente,
    tipoEmision: it.tipoEmision,
    razonSocial: it.razonSocial,
    ...(it.nombreComercial ? { nombreComercial: it.nombreComercial } : {}),
    ruc: it.ruc,
    claveAcceso: accessKey,            // <--- justo antes de codDoc
    codDoc: it.codDoc,
    estab: it.estab,
    ptoEmi: it.ptoEmi,
    secuencial: it.secuencial,
    dirMatriz: it.dirMatriz,
  };
  // Campos opcionales permitidos después:
  if (it.regimenMicroempresas) infoTributariaOrdered.regimenMicroempresas = it.regimenMicroempresas;
  if (it.agenteRetencion)      infoTributariaOrdered.agenteRetencion = it.agenteRetencion;
  if (it.contribuyenteRimpe)   infoTributariaOrdered.contribuyenteRimpe = it.contribuyenteRimpe;


  const invoice: Invoice = {
    factura: {
      "@id": "comprobante",
      "@version": "1.1.0",
      infoTributaria: infoTributariaOrdered,
      infoFactura: invoiceData.infoFactura,
      detalles: invoiceData.detalles,
      ...(invoiceData.infoAdicional && { infoAdicional: invoiceData.infoAdicional }),
    },
  };

  return { invoice, accessKey };
}
