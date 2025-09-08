
/**
 * @fileoverview Contiene la función para enviar un comprobante electrónico para su recepción y validación
 * en el web service del SRI.
 */

import { createClient, Client } from "soap";

/**
 * Envía un comprobante electrónico en formato XML al SRI para su validación.
 * @param {string | Buffer} stringXML - El contenido del archivo XML firmado, como una cadena de texto.
 * @param {string} receptionUrl - La URL del WSDL del servicio de recepción del SRI (pruebas o producción).
 * @returns {Promise<any>} Una promesa que se resuelve con la respuesta del servicio de recepción del SRI.
 */
export async function documentReception(
  stringXML: string | Buffer,
  receptionUrl: string
): Promise<any> {
  if (!stringXML) throw new Error('XML firmado vacío (documentReception)');
  // El SRI requiere el XML en Base64
  const base64XML = Buffer.isBuffer(stringXML)
    ? stringXML.toString('base64')
    : Buffer.from(stringXML, 'utf8').toString('base64');
  let params = { xml: base64XML };

  // Se crea una promesa para manejar la llamada asíncrona al servicio SOAP.
  const receptionRequest = new Promise((resolve, reject) => {
     try {
        createClient(receptionUrl, (err, client: Client) => {
          if (err) {
            console.error("Error al crear cliente SOAP:", err.message);
            return reject(new Error('Error al crear el cliente SOAP para recepción.'));
          }
          // Se llama al método 'validarComprobante' del servicio web.
          client.validarComprobante(params, (err: any, result: unknown) => {
            if (err) {
              console.error("Error en llamada SOAP (validarComprobante):", err.body || err.message);
              return reject(new Error('Error en la llamada a validarComprobante.'));
            }
            resolve(result);
          });
        });
     } catch(clientError) {
        console.error("Excepción en cliente SOAP:", clientError);
        reject(new Error('Excepción al crear el cliente SOAP para recepción.'));
     }
  });

  return await receptionRequest;
}
