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
