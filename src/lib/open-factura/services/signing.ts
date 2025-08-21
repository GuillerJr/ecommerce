

import * as forge from "node-forge";

function sha1Base64(text: string, encoding: forge.Encoding = "utf8") {
  let md = forge.md.sha1.create();
  md.update(text, encoding);
  return forge.util.encode64(md.digest().getBytes());
}

function hexToBase64(hex: string) {
  hex = hex.padStart(hex.length + (hex.length % 2), "0");
  const bytes = hex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16));
  const base64String = btoa(String.fromCharCode(...bytes));
  return base64String.match(/.{1,76}/g)!.join("\n");
}

function bigIntToBase64(bigInt: any) {
  const hex = bigInt.toString(16);
  const hexPairs = hex.match(/\w{2}/g);
  const bytes = hexPairs!.map((pair) => parseInt(pair, 16));
  const byteString = String.fromCharCode(...bytes);
  const base64 = btoa(byteString);
  const formatedBase64 = base64.match(/.{1,76}/g)!.join("\n");
  return formatedBase64;
}

function getRandomNumber(min = 1000, max = 9999) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export async function signXml(
  p12Data: ArrayBuffer,
  p12Password: string,
  xmlData: string
) {

  // Store the original Date object
  const OriginalDate = global.Date;

  class MockDate extends OriginalDate {
      private fixedDate: Date;

      constructor(...args: any[]) {
          // If called with arguments, pass them to the original Date constructor
          if (args.length > 0) {
              // @ts-ignore
              super(...args);
              this.fixedDate = new OriginalDate(...args);
          } else {
              // If called without arguments (i.e., new Date()), return a fixed date
              const specificDate = '2025-08-21T00:00:00Z';
              super(specificDate);
              this.fixedDate = new OriginalDate(specificDate);
          }
      }

      static now() {
          return new MockDate().getTime();
      }
  }


  try {
      // @ts-ignore
      global.Date = MockDate;
      let xml = xmlData.replace('<?xml version="1.0" encoding="UTF-8"?>', "").trim();
      xml = xml.replace(/>\s+</g, '><').trim();


      const arrayUint8 = new Uint8Array(p12Data);
      const base64 = forge.util.binary.base64.encode(arrayUint8);
      const der = forge.util.decode64(base64);

      const asn1 = forge.asn1.fromDer(der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, p12Password);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const pkcs8Bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

      const certBag = certBags[forge.pki.oids.certBag]!;
      const keyBag = pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag]!;

      const certificate = certBag[0].cert!;
      const key = keyBag[0].key!;

      const certificateX509_pem = forge.pki.certificateToAsn1(certificate!);
      const certificateX509_der = forge.asn1.toDer(certificateX509_pem).getBytes();
      const hash_certificateX509_der = sha1Base64(certificateX509_der, "binary");
      const issuerName = certificate!.issuer.attributes.map((attribute: any) => `${attribute.shortName}=${attribute.value}`).join(",");
      const certificateX509_serialNumber = parseInt(certificate!.serialNumber, 16);

      let certificateX509 = forge.pki.certificateToPem(certificate!);
      certificateX509 = certificateX509.substr(certificateX509.indexOf("\n"));
      certificateX509 = certificateX509.substr(0, certificateX509.indexOf("\n-----END CERTIFICATE-----"));
      certificateX509 = certificateX509.replace(/\r?\n|\r/g, "");

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

      const date = new OriginalDate();
      const isoDateTime = date.toISOString().slice(0, 19);

      let signedProperties = "";
      signedProperties += `<etsi:SignedProperties Id="Signature${signatureNumber}-SignedProperties${signedPropertiesNumber}">`;
      signedProperties += "<etsi:SignedSignatureProperties>";
      signedProperties += "<etsi:SigningTime>";
      signedProperties += `${isoDateTime}Z`;
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

      const signature = forge.util.encode64(key.sign(md));

      let xadesBes = "";
      xadesBes += `<ds:Signature ${nameSpaces} Id="Signature${signatureNumber}">`;
      xadesBes += canonicalizedSignedInfo;
      xadesBes += `<ds:SignatureValue Id="SignatureValue${signatureValueNumber}">`;
      xadesBes += signature;
      xadesBes += "</ds:SignatureValue>";
      xadesBes += keyInfo;
      xadesBes += `<ds:Object Id="Signature${signatureNumber}-Object${objectNumber}">`;
      xadesBes += `<etsi:QualifyingProperties Target="#Signature${signatureNumber}">`;
      xadesBes += signedProperties;
      xadesBes += "</etsi:QualifyingProperties>";
      xadesBes += "</ds:Object>";
      xadesBes += "</ds:Signature>";

      return `<?xml version="1.0" encoding="UTF-8"?>\n${xml.replace('</factura>', xadesBes + '</factura>')}`;
  } finally {
      // Restore the original Date object
      global.Date = OriginalDate;
  }
}
