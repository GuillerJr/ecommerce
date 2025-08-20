/**
 * @fileoverview Contiene la función para consultar la autorización de un comprobante electrónico
 * en el web service del SRI.
 */

import { createClient, Client } from "soap";

/**
 * Consulta el estado de autorización de un comprobante electrónico en el SRI.
 * @param {string} accesKey - La clave de acceso de 49 dígitos del comprobante.
 * @param {string} authorizationUrl - La URL del WSDL del servicio de autorización del SRI (pruebas o producción).
 * @returns {Promise<any>} Una promesa que se resuelve con la respuesta del servicio de autorización del SRI.
 */
export async function documentAuthorization(
  accesKey: string,
  authorizationUrl: string
) {
  // Parámetros para la solicitud SOAP.
  let params = { claveAccesoComprobante: accesKey };

  let authorizationResponse: any;

  // Se crea una promesa para manejar la llamada asíncrona al servicio SOAP.
  const authorizationRequest = new Promise((resolve, reject) => {
    try {
      createClient(authorizationUrl, (err: any, client: Client) => {
        if (err) {
          return reject(new Error('Error al crear el cliente SOAP: ' + (err.message || 'Error desconocido')));
        }
        // Se llama al método 'autorizacionComprobante' del servicio web.
        client.autorizacionComprobante(params, (err: any, result: unknown) => {
          if (err) {
             return reject(new Error('Error en la llamada a autorizacionComprobante: ' + (err.message || 'Error desconocido')));
          }
          resolve(result);
        });
      });
    } catch (clientError) {
        reject(new Error('Excepción al crear el cliente SOAP.'));
    }
  });

  // Se espera a que la promesa se resuelva.
  authorizationResponse = await authorizationRequest;

  return authorizationResponse;
}
