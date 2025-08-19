/**
 * @fileoverview Define la estructura para la información adicional en una factura electrónica.
 * Esta sección permite añadir campos personalizados que no están definidos en el esquema estándar del SRI.
 */

/**
 * @type {AdditionalField}
 * Define un campo adicional individual, que consiste en un nombre y un valor.
 * @property {"@nombre"} string - El nombre del campo adicional (ej. "Email de Contacto").
 * @property {"#"} string - El valor del campo adicional (ej. "cliente@example.com").
 */
export type AdditionalField = {
  "@nombre": string;
  "#": string;
};

/**
 * @type {AdditionalInfo}
 * Define el contenedor para una lista de campos adicionales.
 * @property {AdditionalField[]} campoAdicional - Un array de campos adicionales.
 */
export type AdditionalInfo = {
  campoAdicional: AdditionalField[];
};

// Ejemplo de uso, no utilizado directamente en la lógica de la aplicación.
export const additionalInfo = {
  campoAdicional: [
    {
      "@nombre": "nombre4",
      "#": "campoAdicional0",
    },
    {
      "@nombre": "nombre5",
      "#": "campoAdicional1",
    },
  ],
};
