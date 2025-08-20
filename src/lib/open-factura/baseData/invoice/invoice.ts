/**
 * @fileoverview Define la estructura completa del objeto `Factura`, que es la
 * representación raíz del comprobante electrónico. También define el tipo de entrada
 * `InvoiceInput` que se usa para generar la factura.
 */

import { AdditionalInfo } from "./additionalInfo";
import { Details } from "./details";
import { InvoiceInfo } from "./invoiceInfo";
import { OtherThirdPartyValues } from "./otherThirdPartyValues";
import { Reimbursements } from "./reimbursements";
import { RemisionGuideSustitutiveInfo } from "./remissionGuidesSustitutiveInfo";
import { Retentions } from "./retentions";
import { TaxInfo } from "./taxInfo";

/**
 * @type {Invoice}
 * Define la estructura completa del XML de la factura electrónica, incluyendo
 * todos sus componentes como información tributaria, información de la factura,
 * detalles, y campos opcionales.
 */
export type Invoice = {
  factura: {
    "@id": string;
    "@version": string;
    infoTributaria: TaxInfo;
    infoFactura: InvoiceInfo;
    detalles: Details;
    reembolsos?: Reimbursements;
    retenciones?: Retentions;
    infoSustitutivaGuiaRemision?: RemisionGuideSustitutiveInfo;
    otrosRubrosTerceros?: OtherThirdPartyValues;
    tipoNegociable?: {
      correo: string;
    };
    maquinaFiscal?: {
      marca: string;
      modelo: string;
      serie: string;
    };
    infoAdicional?: AdditionalInfo;
  };
};

/**
 * @type {InvoiceInput}
 * Define la estructura de datos necesaria para generar una nueva factura.
 * Es similar a `Invoice`, pero omite la `claveAcceso` en `infoTributaria`,
 * ya que esta se genera automáticamente.
 */
export type InvoiceInput = {
  infoTributaria: Omit<TaxInfo, "claveAcceso">;
  infoFactura: InvoiceInfo;
  detalles: Details;
  reembolsos?: Reimbursements;
  retenciones?: Retentions;
  infoSustitutivaGuiaRemision?: RemisionGuideSustitutiveInfo;
  otrosRubrosTerceros?: OtherThirdPartyValues;
  tipoNegociable?: {
    correo: string;
  };
  maquinaFiscal?: {
    marca: string;
    modelo: string;
    serie: string;
  };
  infoAdicional?: AdditionalInfo;
};
