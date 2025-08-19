/**
 * @fileoverview Define la estructura para la información de una guía de remisión
 * que puede ser sustituida por la factura, bajo ciertas condiciones.
 */

/**
 * @type {Arrival}
 * Define un destino dentro de la guía de remisión.
 * @property {string} motivoTraslado - La razón del transporte de la mercancía.
 * @property {string} codEstabDestino - El código del establecimiento de destino.
 * @property {string} ruta - La descripción de la ruta a seguir.
 */
export type Arrival = {
  motivoTraslado: string;
  docAduaneroUnico: string;
  codEstabDestino: string;
  ruta: string;
};

/**
 * @type {Arrivals}
 * Contenedor para la lista de destinos.
 */
export type Arrivals = {
  destino: Arrival[];
};

/**
 * @type {RemisionGuideSustitutiveInfo}
 * Define la información completa de la guía de remisión sustitutiva.
 * @property {string} dirPartida - Dirección de punto de partida.
 * @property {string} dirDestinatario - Dirección del destinatario.
 * @property {string} fechaIniTransporte - Fecha de inicio del transporte.
 * @property {string} fechaFinTransporte - Fecha de fin del transporte.
 * @property {string} razonSocialTransportista - Nombre o razón social del transportista.
 * @property {string} rucTransportista - RUC del transportista.
 * @property {string} placa - Placa del vehículo que realiza el transporte.
 * @property {Arrivals} destinos - Lista de los destinos del transporte.
 */
export type RemisionGuideSustitutiveInfo = {
  dirPartida: string;
  dirDestinatario: string;
  fechaIniTransporte: string;
  fechaFinTransporte: string;
  razonSocialTransportista: string;
  tipoIdentificacionTransportista: string;
  rucTransportista: string;
  placa: string;
  destinos: Arrivals;
};
