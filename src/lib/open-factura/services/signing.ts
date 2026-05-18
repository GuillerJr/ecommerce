

import * as forge from "node-forge";
import { create } from "xmlbuilder2";
import type { Invoice, InvoiceInput } from "../baseData/invoice/invoice";
import { generateAccessKey } from "../utils/utils";

function sha256Base64(text: string, encoding: forge.Encoding = "utf8") {
  const md = forge.md.sha256.create();
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
  const bytes = (hexPairs || []).map((pair: string) => parseInt(pair, 16));
  const byteString = String.fromCharCode(...bytes);
  const base64 = btoa(byteString);
  const formatedBase64 = (base64.match(/.{1,76}/g) || []).join("\n");
  return formatedBase64;
}

function getRandomNumber(min = 1000, max = 9999) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export async function signXml(
  p12Data: ArrayBuffer | Buffer | Uint8Array,
  p12Password: string,
  xmlData: string | Buffer | ArrayBuffer | Uint8Array,
  emissionDate: Date,
): Promise<string> {
    if (!p12Data) throw new Error('p12Data undefined (firma .p12 no provista)');
    if (!xmlData) throw new Error('xmlData undefined (XML sin contenido)');
    const xmlString = typeof xmlData === 'string' ? xmlData : Buffer.from(xmlData as any).toString('utf8');
    let xml = xmlString.replace('<?xml version="1.0" encoding="UTF-8"?>\n', '');
    xml = xml.replace(/\s+/g, " ");
    xml = xml.trim();
    xml = xml.replace(/(?<=\>)(\r?\n)|(\r?\n)(?=\<\/)/g, "");
    xml = xml.trim();
    xml = xml.replace(/(?<=\>)(\s*)/g, "");
    
    try {
        const arrayUint8 = new Uint8Array(p12Data);
        const base64 = forge.util.binary.base64.encode(arrayUint8);
        const der = forge.util.decode64(base64);
        const asn1 = forge.asn1.fromDer(der);
        const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, p12Password);

        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
        const keyBags  = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
        
        if (!keyBags.length) throw new Error('No se encontró clave privada en el .p12');
        const key = keyBags[0].key! as any;
        
        const signerCert = certBags.find((b: any) => b.cert && b.cert.publicKey && b.cert.publicKey.n?.equals(key.n))?.cert
                        || certBags[0].cert;

        if (!signerCert) throw new Error('No se encontró un certificado de firmante en el .p12');

        const chainCerts = certBags
            .map(b => b.cert)
            .filter(c => c && c !== signerCert); // resto de la cadena
        
        const certificateX509_pem = forge.pki.certificateToAsn1(signerCert);
        const certificateX509_der = forge.asn1.toDer(certificateX509_pem).getBytes();
        const hash_certificateX509_der = sha256Base64(certificateX509_der, "binary" as forge.Encoding);
        
        const issuerName = signerCert.issuer.attributes
          .map(a => `${a.name?.toUpperCase().replace('ORGANIZATIONALUNITNAME','OU').replace('COUNTRYNAME','C').replace('ORGANIZATIONNAME','O').replace('COMMONNAME','CN')}=${a.value}`)
          .join(',');
        const certificateX509_serialNumber = parseInt(signerCert.serialNumber, 16);

        let certificateX509 = forge.pki.certificateToPem(signerCert);
        certificateX509 = certificateX509.substring(certificateX509.indexOf("\n") + 1, certificateX509.indexOf("\n-----END CERTIFICATE-----"));
        certificateX509 = certificateX509.replace(/\r?\n|\r/g, "");
        certificateX509 = (certificateX509.match(/.{1,76}/g) || []).join("\n");

        const exponent = hexToBase64(key.e.toString(16));
        const modulus = bigIntToBase64(key.n);

        const sha_xml = sha256Base64(xml, "utf8");

        const nameSpaces = 'xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" xmlns:etsi141="http://uri.etsi.org/01903/v1.4.1#"';

        const certificateNumber = getRandomNumber();
        const signatureNumber = getRandomNumber();
        const signedPropertiesNumber = getRandomNumber();
        const signedInfoNumber = getRandomNumber();
        const signedPropertiesIdNumber = getRandomNumber();
        const referenceIdNumber = getRandomNumber();
        const signatureValueNumber = getRandomNumber();
        const objectNumber = getRandomNumber();
        
        const signingTime = emissionDate.toISOString().slice(0, -5) + 'Z';
        
        let signedProperties = "";
        signedProperties += `<etsi:SignedProperties Id="Signature${signatureNumber}-SignedProperties${signedPropertiesNumber}">`;
        signedProperties += "<etsi:SignedSignatureProperties>";
        signedProperties += "<etsi:SigningTime>";
        signedProperties += signingTime;
        signedProperties += "</etsi:SigningTime>";
        signedProperties += "<etsi141:SigningCertificateV2>";
        signedProperties += "<etsi141:Cert>";
        signedProperties += "<etsi141:CertDigest>";
        signedProperties += '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>';
        signedProperties += "<ds:DigestValue>" + hash_certificateX509_der + "</ds:DigestValue>";
        signedProperties += "</etsi141:CertDigest>";
        signedProperties += "<etsi141:IssuerSerialV2>";
        signedProperties += issuerName;
        signedProperties += "</etsi141:IssuerSerialV2>";
        signedProperties += "</etsi141:Cert>";
        signedProperties += "</etsi141:SigningCertificateV2>";
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
        
        const shaSignedProperties = sha256Base64(signedProperties.replace('<etsi:SignedProperties', `<etsi:SignedProperties ${nameSpaces}`), "utf8");
        
        const chainPemList = chainCerts.map((c) => {
          if (!c) return '';
          let pem = forge.pki.certificateToPem(c);
          pem = pem.substring(pem.indexOf("\n")+1, pem.indexOf("\n-----END CERTIFICATE-----"));
          return (pem.replace(/\r?\n|\r/g, "").match(/.{1,76}/g) || []).join("\n");
        });
        const x509Data = [
          `<ds:X509Certificate>${certificateX509}</ds:X509Certificate>`,
          ...chainPemList.map(p => `<ds:X509Certificate>${p}</ds:X509Certificate>`)
        ].filter(Boolean).join('');

        const keyInfo =
          `<ds:KeyInfo Id="Certificate${certificateNumber}">` +
            `<ds:X509Data>${x509Data}</ds:X509Data>` +
            `<ds:KeyValue><ds:RSAKeyValue><ds:Modulus>${modulus}</ds:Modulus><ds:Exponent>${exponent}</ds:Exponent></ds:RSAKeyValue></ds:KeyValue>` +
          `</ds:KeyInfo>`;

        const shaKeyInfo = sha256Base64(keyInfo.replace('<ds:KeyInfo', `<ds:KeyInfo ${nameSpaces}`), "utf8");
        
        let signedInfo = "";
        signedInfo += `<ds:SignedInfo Id="Signature-SignedInfo${signedInfoNumber}">`;
        signedInfo += '<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>';
        signedInfo += '<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></ds:SignatureMethod>';
        signedInfo += `<ds:Reference Id="SignedPropertiesID${signedPropertiesIdNumber}" Type="http://uri.etsi.org/01903#SignedProperties" URI="#Signature${signatureNumber}-SignedProperties${signedPropertiesNumber}">`;
        signedInfo += '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>';
        signedInfo += `<ds:DigestValue>${shaSignedProperties}</ds:DigestValue>`;
        signedInfo += '</ds:Reference>';
        signedInfo += `<ds:Reference URI="#Certificate${certificateNumber}">`;
        signedInfo += '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>';
        signedInfo += `<ds:DigestValue>${shaKeyInfo}</ds:DigestValue>`;
        signedInfo += '</ds:Reference>';
        signedInfo += `<ds:Reference Id="Reference-ID-${referenceIdNumber}" URI="#comprobante">`;
        signedInfo += "<ds:Transforms>";
        signedInfo += '<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform>';
        signedInfo += '<ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:Transform>';
        signedInfo += "</ds:Transforms>";
        signedInfo += '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>';
        signedInfo += `<ds:DigestValue>${sha_xml}</ds:DigestValue>`;
        signedInfo += '</ds:Reference>';
        signedInfo += "</ds:SignedInfo>";

        const canonicalizedSignedInfo = signedInfo.replace('<ds:SignedInfo', `<ds:SignedInfo ${nameSpaces}`);
        const md = forge.md.sha256.create();
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
        
        return xml.replace('</factura>', xadesBes + '</factura>');
        
    } catch(e) {
      console.error("Error en la firma:", e);
      throw e;
    }
}
