

import * as forge from "node-forge";
import { create } from "xmlbuilder2";
import type { Invoice, InvoiceInput } from "../baseData/invoice/invoice";
import { generateAccessKey } from "../utils/utils";

function sha1Base64(text: string, encoding: forge.Encoding = "utf8") {
  let md = forge.md.sha1.create();
  md.update(text, encoding);
  return forge.util.encode64(md.digest().getBytes());
}

function hexToBase64(hex: string) {
  hex = hex.padStart(hex.length + (hex.length % 2), "0");
  const bytes = (hex.match(/.{2}/g) || []).map((byte) => parseInt(byte, 16));
  const base64String = btoa(String.fromCharCode(...bytes));
  return (base64String.match(/.{1,76}/g) || []).join("\n");
}

function bigIntToBase64(bigInt: any) {
  const hex = bigInt.toString(16);
  const hexPairs = hex.match(/\w{2}/g);
  const bytes = (hexPairs || []).map((pair) => parseInt(pair, 16));
  const byteString = String.fromCharCode(...bytes);
  const base64 = btoa(byteString);
  const formatedBase64 = (base64.match(/.{1,76}/g) || []).join("\n");
  return formatedBase64;
}

function getRandomNumber(min = 1000, max = 9999) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export async function signXml(
  p12Data: ArrayBuffer,
  p12Password: string,
  invoiceData: { factura: InvoiceInput }
) {
    const emissionDate = new Date();

    const accessKey = generateAccessKey({
        date: emissionDate,
        codDoc: invoiceData.factura.infoTributaria.codDoc,
        ruc: invoiceData.factura.infoTributaria.ruc,
        environment: invoiceData.factura.infoTributaria.ambiente,
        establishment: invoiceData.factura.infoTributaria.estab,
        emissionPoint: invoiceData.factura.infoTributaria.ptoEmi,
        sequential: invoiceData.factura.infoTributaria.secuencial,
    });

    invoiceData.factura.infoFactura.fechaEmision = emissionDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const invoiceObject: Invoice = {
      factura: {
        "@id": "comprobante",
        "@version": "1.1.0",
        infoTributaria: { ...invoiceData.factura.infoTributaria, claveAcceso: accessKey },
        infoFactura: invoiceData.factura.infoFactura,
        detalles: invoiceData.factura.detalles,
        ...(invoiceData.factura.infoAdicional && { infoAdicional: invoiceData.factura.infoAdicional }),
      },
    };

    const document = create({ encoding: 'UTF-8' }, invoiceObject);
    let xml = document.end({ headless: true }).trim();
    xml = xml.replace(/>\s+</g, '><').trim();

    // The signing process can interfere with the global Date object in some environments.
    // We save and restore it to ensure consistency.
    const OriginalDate = global.Date;

    try {
        const arrayUint8 = new Uint8Array(p12Data);
        const base64 = forge.util.binary.base64.encode(arrayUint8);
        const der = forge.util.decode64(base64);
        const asn1 = forge.asn1.fromDer(der);
        const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, p12Password);

        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const pkcs8Bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const certBag = certBags[forge.pki.oids.certBag]!;
        const keyBag = pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag]!;

        const certificate = certBag.sort((a,b) => (b.cert?.extensions.length || 0) - (a.cert?.extensions.length || 0))[0].cert!;
        const key = keyBag[0].key!;

        const certificateX509_pem = forge.pki.certificateToAsn1(certificate);
        const certificateX509_der = forge.asn1.toDer(certificateX509_pem).getBytes();
        const hash_certificateX509_der = sha1Base64(certificateX509_der, "binary");

        const issuerName = certificate.issuer.attributes.map((attribute) => `${attribute.shortName}=${attribute.value}`).join(",");
        const certificateX509_serialNumber = parseInt(certificate.serialNumber, 16);

        let certificateX509 = forge.pki.certificateToPem(certificate);
        certificateX509 = certificateX509.substring(certificateX509.indexOf("\n") + 1, certificateX509.indexOf("\n-----END CERTIFICATE-----"));
        certificateX509 = certificateX509.replace(/\r?\n|\r/g, "");
        certificateX509 = (certificateX509.match(/.{1,76}/g) || []).join("\n");


        const exponent = hexToBase64(key.e.toString(16));
        const modulus = bigIntToBase64(key.n);

        const sha1_xml = sha1Base64(xml, "utf8");

        const nameSpaces = 'xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#"';

        const certificateNumber = getRandomNumber();
        const signatureNumber = getRandomNumber();
        const signedPropertiesNumber = getRandomNumber();
        const signedInfoNumber = getRandomNumber();
        const signedPropertiesIdNumber = getRandomNumber();
        const referenceIdNumber = getRandomNumber();
        const signatureValueNumber = getRandomNumber();
        const objectNumber = getRandomNumber();

        const signingTime = new OriginalDate().toISOString().slice(0, 19) + 'Z';

        let signedProperties = "";
        signedProperties += `<etsi:SignedProperties Id="Signature${signatureNumber}-SignedProperties${signedPropertiesNumber}">`;
        signedProperties += "<etsi:SignedSignatureProperties>";
        signedProperties += "<etsi:SigningTime>";
        signedProperties += signingTime;
        signedProperties += "</etsi:SigningTime>";
        signedProperties += "<etsi:SigningCertificate>";
        signedProperties += "<etsi:Cert>";
        signedProperties += "<etsi:CertDigest>";
        signedProperties += '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>';
        signedProperties += "<ds:DigestValue>";
        signedProperties += hash_certificateX509_der;
        signedProperties += "</ds:DigestValue>";
        signedProperties += "</etsi:CertDigest>";
        signedProperties += "<etsi:IssuerSerial>";
        signedProperties += "<ds:X509IssuerName>";
        signedProperties += issuerName;
        signedProperties += "</ds:X509IssuerName>";
        signedProperties += "<ds:X509SerialNumber>";
        signedProperties += certificateX509_serialNumber;
        signedProperties += "</ds:X509SerialNumber>";
        signedProperties += "</etsi:IssuerSerial>";
        signedProperties += "</etsi:Cert>";
        signedProperties += "</etsi:SigningCertificate>";
        signedProperties += "</etsi:SignedSignatureProperties>";
        signedProperties += "<etsi:SignedDataObjectProperties>";
        signedProperties += `<etsi:DataObjectFormat ObjectReference="#Reference-ID-${referenceIdNumber}">`;
        signedProperties += "<etsi:Description>";
        signedProperties += "contenido comprobante";
        signedProperties += "</etsi:Description>";
        signedProperties += "<etsi:MimeType>";
        signedProperties += "text/xml";
        signedProperties += "</etsi:MimeType>";
        signedProperties += "</etsi:DataObjectFormat>";
        signedProperties += "</etsi:SignedDataObjectProperties>";
        signedProperties += "</etsi:SignedProperties>";

        const sha1SignedProperties = sha1Base64(signedProperties.replace('<etsi:SignedProperties', `<etsi:SignedProperties ${nameSpaces}`), "utf8");

        const keyInfo = `<ds:KeyInfo Id="Certificate${certificateNumber}"><ds:X509Data><ds:X509Certificate>${certificateX509}</ds:X509Certificate></ds:X509Data><ds:KeyValue><ds:RSAKeyValue><ds:Modulus>${modulus}</ds:Modulus><ds:Exponent>${exponent}</ds:Exponent></ds:RSAKeyValue></ds:KeyValue></ds:KeyInfo>`;
        const sha1KeyInfo = sha1Base64(keyInfo.replace('<ds:KeyInfo', `<ds:KeyInfo ${nameSpaces}`), "utf8");

        let signedInfo = "";
        signedInfo += `<ds:SignedInfo Id="Signature-SignedInfo${signedInfoNumber}">`;
        signedInfo += '<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>';
        signedInfo += '<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod>';
        signedInfo += `<ds:Reference Id="SignedPropertiesID${signedPropertiesIdNumber}" Type="http://uri.etsi.org/01903#SignedProperties" URI="#Signature${signatureNumber}-SignedProperties${signedPropertiesNumber}">`;
        signedInfo += '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>';
        signedInfo += `<ds:DigestValue>${sha1SignedProperties}</ds:DigestValue>`;
        signedInfo += '</ds:Reference>';
        signedInfo += `<ds:Reference URI="#Certificate${certificateNumber}">`;
        signedInfo += '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>';
        signedInfo += `<ds:DigestValue>${sha1KeyInfo}</ds:DigestValue>`;
        signedInfo += '</ds:Reference>';
        signedInfo += `<ds:Reference Id="Reference-ID-${referenceIdNumber}" URI="#comprobante">`;
        signedInfo += "<ds:Transforms>";
        signedInfo += '<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform>';
        signedInfo += "</ds:Transforms>";
        signedInfo += '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>';
        signedInfo += `<ds:DigestValue>${sha1_xml}</ds:DigestValue>`;
        signedInfo += '</ds:Reference>';
        signedInfo += "</ds:SignedInfo>";

        const canonicalizedSignedInfo = signedInfo.replace('<ds:SignedInfo', `<ds:SignedInfo ${nameSpaces}`);
        const md = forge.md.sha1.create();
        md.update(canonicalizedSignedInfo, "utf8");

        const signature = (forge.util.encode64(key.sign(md)).match(/.{1,76}/g) || []).join("\n");

        let xadesBes = "";
        xadesBes += `<ds:Signature ${nameSpaces} Id="Signature${signatureNumber}">`;
        xadesBes += canonicalizedSignedInfo;
        xadesBes += `<ds:SignatureValue Id="SignatureValue${signatureValueNumber}">\n`;
        xadesBes += signature;
        xadesBes += `\n</ds:SignatureValue>`;
        xadesBes += keyInfo;
        xadesBes += `<ds:Object Id="Signature${signatureNumber}-Object${objectNumber}">`;
        xadesBes += `<etsi:QualifyingProperties Target="#Signature${signatureNumber}">`;
        xadesBes += signedProperties;
        xadesBes += "</etsi:QualifyingProperties>";
        xadesBes += "</ds:Object>";
        xadesBes += "</ds:Signature>";

        const finalXml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml.replace('</factura>', xadesBes + '</factura>')}`;
        return { signedXml: finalXml, accessKey };
    } finally {
        global.Date = OriginalDate;
    }
}
