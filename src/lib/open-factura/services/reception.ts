/**
 * @fileoverview Contiene la función para enviar un comprobante electrónico para su recepción y validación
 * en el web service del SRI.
 */

import { createClient, Client } from "soap";

/**
 * Envía un comprobante electrónico en formato XML al SRI para su validación.
 * @param {string} stringXML - El contenido del archivo XML firmado, como una cadena de texto.
 * @param {string} receptionUrl - La URL del WSDL del servicio de recepción del SRI (pruebas o producción).
 * @returns {Promise<any>} Una promesa que se resuelve con la respuesta del servicio de recepción del SRI.
 */
export async function documentReception(
  stringXML: string,
  receptionUrl: string
): Promise<any> {
  // El SRI requiere que el XML se envíe como una cadena Base64.
  const base64XML = Buffer.from(stringXML).toString("base64");
  let params = { xml: base64XML };

  let receptionResult: any;

  // Se crea una promesa para manejar la llamada asíncrona al servicio SOAP.
  const receptionRequest = new Promise((resolve, reject) => {
    createClient(receptionUrl, (err, client: Client) => {
      if (err) {
        reject(err);
        return;
      }
      // Se llama al método 'validarComprobante' del servicio web.
      client.validarComprobante(params, (err: any, result: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  });

  receptionResult = await receptionRequest;
  return receptionResult;
}
