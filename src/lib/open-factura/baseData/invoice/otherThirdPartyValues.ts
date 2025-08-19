/**
 * @fileoverview Define la estructura para rubros de terceros en una factura electrónica.
 * Se utiliza para detallar valores que corresponden a terceros, como en el caso de agencias de viajes.
 */

/**
 * @type {ThirdPartyValue}
 * Representa un único rubro de tercero.
 * @property {string} concepto - Descripción del concepto del rubro.
 * @property {string} total - El valor total del rubro.
 */
export type ThirdPartyValue = {
  concepto: string;
  total: string;
};

/**
 * @type {OtherThirdPartyValues}
 * Contenedor para una lista de rubros de terceros.
 * @property {ThirdPartyValue[]} rubro - Un array de rubros.
 */
export type OtherThirdPartyValues = {
  rubro: ThirdPartyValue[];
};
