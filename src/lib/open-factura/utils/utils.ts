/**
 * @fileoverview Utilidades para la generación de la clave de acceso de 49 dígitos
 * requerida por el SRI para cada comprobante electrónico.
 */

/**
 * @type {GenerateAccessKey}
 * Define la estructura de datos necesaria para generar la clave de acceso.
 * @property {Date} date - Fecha de emisión del comprobante.
 * @property {"01" | ...} codDoc - Código del tipo de documento (ej. '01' para factura).
 * @property {string} ruc - RUC del emisor.
 * @property {"1" | "2"} environment - Ambiente (1: Pruebas, 2: Producción).
 * @property {string} establishment - Código del establecimiento (3 dígitos).
 * @property {string} emissionPoint - Código del punto de emisión (3 dígitos).
 * @property {string} sequential - Secuencial del comprobante (9 dígitos).
 */
export type GenerateAccessKey = {
  date: Date;
  codDoc: "01" | "03" | "04" | "05" | "06" | "07";
  ruc: string;
  environment: "1" | "2";
  establishment: string;
  emissionPoint: string;
  sequential: string;
};

/**
 * Genera la clave de acceso de 49 dígitos.
 * @param {GenerateAccessKey} accessKeyData - Los datos para construir la clave.
 * @returns {string} La clave de acceso de 49 dígitos.
 */
export function generateAccessKey(accessKeyData: GenerateAccessKey) {
  let accessKey = "";
  accessKey += formatDateToDDMMYYYY(accessKeyData.date);
  accessKey += accessKeyData.codDoc;
  accessKey += accessKeyData.ruc;
  accessKey += accessKeyData.environment;
  accessKey += accessKeyData.establishment;
  accessKey += accessKeyData.emissionPoint;
  accessKey += accessKeyData.sequential;
  accessKey += generateRandomEightDigitNumber(); // Código numérico aleatorio
  accessKey += "1"; // Tipo de emisión (siempre '1' para Normal)
  accessKey += generateVerificatorDigit(accessKey); // Dígito verificador (Módulo 11)
  return accessKey;
}

/**
 * Formatea una fecha a formato ddmmaaaa.
 * @param {Date} date - La fecha a formatear.
 * @returns {string} La fecha en formato ddmmaaaa.
 */
function formatDateToDDMMYYYY(date: Date) {
  // Forzamos America/Guayaquil para evitar “fecha futura” con servidores en UTC
  const parts = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const dd = parts.find(p => p.type === 'day')!.value;
  const mm = parts.find(p => p.type === 'month')!.value;
  const yyyy = parts.find(p => p.type === 'year')!.value;
  return `${dd}${mm}${yyyy}`;
}

export function getFormattedDate(date: Date) {
  const parts = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const dd = parts.find(p => p.type === 'day')!.value;
  const mm = parts.find(p => p.type === 'month')!.value;
  const yyyy = parts.find(p => p.type === 'year')!.value;
  return `${dd}/${mm}/${yyyy}`;
}


/**
 * Genera un número aleatorio de 8 dígitos para la clave de acceso.
 * @returns {number} Un número aleatorio de 8 dígitos.
 */
function generateRandomEightDigitNumber(): number {
  const min = 10000000;
  const max = 99999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calcula el dígito verificador (Módulo 11) para la clave de acceso.
 * @param {string} accessKey - La clave de acceso de 48 dígitos (sin el dígito verificador).
 * @returns {number} El dígito verificador calculado.
 */
function generateVerificatorDigit(accessKey: string) {
  let result = 0;
  let addition = 0;
  let multiple = 7;
  for (let i = 0; i < accessKey.length; i++) {
    addition += parseInt(accessKey.charAt(i)) * multiple;
    multiple > 2 ? multiple-- : (multiple = 7);
  }
  result = 11 - (addition % 11);
  if (result === 10) result = 1;
  if (result === 11) result = 0;
  return result;
}
