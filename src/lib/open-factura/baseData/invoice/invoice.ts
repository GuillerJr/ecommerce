
import { AdditionalInfo } from "./additionalInfo";
import { Details } from "./details";
import { InvoiceInfo } from "./invoiceInfo";
import {
  OtherThirdPartyValues,
} from "./otherThirdPartyValues";
import { Reimbursements } from "./reimbursements";
import {
  RemisionGuideSustitutiveInfo,
} from "./remissionGuidesSustitutiveInfo";
import { Retentions } from "./retentions";
import { TaxInfo } from "./taxInfo";

export type Invoice = {
  factura: {
    "@xmlns:ds": string;
    "@xmlns:xsi": string;
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
