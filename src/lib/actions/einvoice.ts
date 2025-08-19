
'use server';

import type { Order, Product, StoreConfig } from '@/types';
import { getOrderByIdFromDb, updateOrderStatusInDb } from '../data/orders';
import { getStoreConfigFromDb, updateStoreConfigInDb } from '../data/store';
import {
  generateInvoice,
  generateInvoiceXml,
  signXml,
  documentReception,
  documentAuthorization,
} from '../open-factura';
import { generateRidePdf } from '../einvoice/ride';
import { sendEmail } from '../email.server';
import { query } from '../db.server';

const isProduction = process.env.NODE_ENV === 'production';
const SRI_RECEPTION_URL = isProduction
    ? "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl"
    : "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl";
const SRI_AUTHORIZATION_URL = isProduction
    ? "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
    : "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl";


export async function generateEInvoiceAction(orderId: string, allProducts: Product[]) {
  try {
    // 1. Get data
    const order = await getOrderByIdFromDb(orderId);
    const storeConfig = await getStoreConfigFromDb();

    if (!order) throw new Error("Pedido no encontrado.");
    if (!storeConfig.isEInvoicingEnabled) throw new Error("La facturación electrónica no está habilitada.");
    if (!storeConfig.eSignatureFile) throw new Error("La firma electrónica no está configurada.");
    if (!process.env.E_SIGNATURE_PASSWORD) throw new Error("La contraseña de la firma electrónica no está configurada.");
    if (order.eInvoiceAuthorization) throw new Error("Este pedido ya tiene una factura autorizada.");

    // 2. Prepare invoice data for open-factura
    const taxRateCode = storeConfig.taxRate === 12 ? '2' : (storeConfig.taxRate === 15 ? '4' : '0');

    const invoiceData = {
      infoTributaria: {
        ambiente: isProduction ? '2' : '1',
        tipoEmision: '1' as const,
        razonSocial: storeConfig.name,
        nombreComercial: storeConfig.name,
        ruc: storeConfig.address.postalCode, // Assuming RUC is stored here as per previous context
        codDoc: '01' as const,
        estab: '001',
        ptoEmi: '001',
        secuencial: String(storeConfig.nextInvoiceNumber).padStart(9, '0'),
        dirMatriz: storeConfig.address.street,
      },
      infoFactura: {
        fechaEmision: new Date(order.date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dirEstablecimiento: storeConfig.address.street,
        obligadoContabilidad: 'SI' as const,
        tipoIdentificacionComprador: '05' as const, // Cédula
        razonSocialComprador: order.customerName,
        identificacionComprador: order.identification || '9999999999',
        direccionComprador: order.shippingAddress?.address || 'N/A',
        totalSinImpuestos: order.subtotal.toFixed(2),
        totalDescuento: order.discountAmount.toFixed(2),
        totalConImpuestos: {
          totalImpuesto: [
            {
              codigo: '2' as const,
              codigoPorcentaje: taxRateCode,
              baseImponible: (order.subtotal - order.discountAmount).toFixed(2),
              valor: order.taxAmount?.toFixed(2) || '0.00',
              tarifa: String(storeConfig.taxRate || 0)
            },
          ],
        },
        propina: '0.00',
        importeTotal: order.total.toFixed(2),
        moneda: 'DOLAR',
        pagos: {
          pago: [
            {
              formaPago: '01', // SIN UTILIZACION DEL SISTEMA FINANCIERO
              total: order.total.toFixed(2),
            },
          ],
        },
      },
      detalles: {
        detalle: order.items.map(item => {
          const product = allProducts.find(p => p.id === item.productId);
          const itemTotal = item.quantity * item.price;
          const taxValue = (itemTotal * (storeConfig.taxRate || 0) / 100).toFixed(2);
          return {
            codigoPrincipal: item.productId.substring(0, 25),
            descripcion: product?.name || 'Producto',
            cantidad: item.quantity.toString(),
            precioUnitario: item.price.toFixed(6), // SRI requires 6 decimal places for unit price
            descuento: '0.00',
            precioTotalSinImpuesto: itemTotal.toFixed(2),
            impuestos: {
              impuesto: [
                {
                  codigo: '2' as const,
                  codigoPorcentaje: taxRateCode,
                  tarifa: String(storeConfig.taxRate || 0),
                  baseImponible: itemTotal.toFixed(2),
                  valor: taxValue,
                },
              ],
            },
          };
        }),
      },
    };

    // 3. Generate XML
    const { invoice, accessKey } = generateInvoice(invoiceData);
    const invoiceXml = generateInvoiceXml(invoice);

    // 4. Sign XML
    const signatureBuffer = Buffer.from(storeConfig.eSignatureFile, 'base64');
    const signedXml = await signXml(signatureBuffer, process.env.E_SIGNATURE_PASSWORD, invoiceXml);

    // 5. Send to SRI for reception
    const receptionResult = await documentReception(signedXml, SRI_RECEPTION_URL);
    if (receptionResult?.estado !== 'RECIBIDA') {
        throw new Error(`SRI: ${receptionResult?.comprobantes?.comprobante?.mensajes?.mensaje?.mensaje || 'Error en la recepción.'}`);
    }

    // 6. Authorize with SRI
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for SRI to process
    const authorizationResult = await documentAuthorization(accessKey, SRI_AUTHORIZATION_URL);
    const authorization = authorizationResult?.autorizaciones?.autorizacion;

    if (authorization?.estado !== 'AUTORIZADO') {
        await query('UPDATE orders SET "eInvoiceStatus" = $1, "eInvoiceAuthorization" = $2 WHERE id = $3', ['REJECTED', JSON.stringify(authorization?.mensajes), orderId]);
        throw new Error(`SRI: ${authorization?.mensajes?.mensaje?.mensaje || 'No autorizado.'}`);
    }

    const authorizationNumber = authorization.numeroAutorizacion;

    // 7. Update DB
    await query('UPDATE orders SET "eInvoiceStatus" = $1, "eInvoiceAuthorization" = $2 WHERE id = $3', ['AUTHORIZED', authorizationNumber, orderId]);
    await updateStoreConfigInDb({ ...storeConfig, nextInvoiceNumber: storeConfig.nextInvoiceNumber + 1 });

    // 8. Generate and send RIDE
    const pdfBuffer = await generateRidePdf(order, storeConfig, authorizationNumber, allProducts);
    await sendEmail(order.email, `Factura Electrónica ${storeConfig.name}`, 'Adjuntamos tu factura electrónica.', [{
        filename: `factura-${order.id.substring(0,8)}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
    }]);

    revalidatePath('/admin/pedidos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    console.error("E-Invoice Error:", message);
    await query('UPDATE orders SET "eInvoiceStatus" = $1, "eInvoiceAuthorization" = $2 WHERE id = $3', ['ERROR', message, orderId]);
    return { success: false, message };
  }
}
