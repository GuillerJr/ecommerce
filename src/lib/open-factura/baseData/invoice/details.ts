
export type AdditionalDetail = {
  "@nombre": string;
  "@valor": string;
};

export type AdditionalDetails = {
  detAdicional: AdditionalDetail[];
};

export type Tax = {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: string;
  baseImponible: string;
  valor: string;
};

export type Taxes = {
  impuesto: Tax[];
};

export type Detail = {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  unidadMedida?: string;
  cantidad: string;
  precioUnitario: string;
  precioSinSubsidio?: string;
  descuento: string;
  precioTotalSinImpuesto: string;
  detallesAdicionales?: AdditionalDetails;
  impuestos: Taxes;
};

export type Details = {
  detalle: Detail[];
};
