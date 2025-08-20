

'use server';

import type { Order, Product, StoreConfig } from '@/types';
import { getOrderByIdFromDb } from '../data/orders';
import { getStoreConfigFromDb, updateStoreConfigInDb } from '../data/store';
import {
  generateInvoice,
  signXml,
  documentReception,
  documentAuthorization,
} from '../open-factura';
import { generateRidePdf } from '../einvoice/ride';
import { sendOrderConfirmationEmail } from '../email.server';
import { query } from '../db.server';
import { revalidatePath } from 'next/cache';

const getSriUrls = (environment: '1' | '2') => {
  if (environment === '2') {
    // Producción
    return {
      reception: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
      authorization: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl",
    };
  }
  // Pruebas
  return {
    reception: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
    authorization: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl",
  };
};


export async function generateEInvoiceAction(orderId: string, allProducts: Product[]): Promise<{ success: boolean; message?: string; pdfBuffer?: Buffer; }> {
  try {
    const order = await getOrderByIdFromDb(orderId);
    const storeConfig = await getStoreConfigFromDb();

    if (!order) throw new Error("Pedido no encontrado.");
    if (!storeConfig.isEInvoicingEnabled) throw new Error("La facturación electrónica no está habilitada.");
    if (!storeConfig.eSignatureFile) throw new Error("La firma electrónica no está configurada.");
    if (!process.env.E_SIGNATURE_PASSWORD) throw new Error("La contraseña de la firma electrónica no está configurada.");
    if (order.eInvoiceAuthorization) throw new Error("Este pedido ya tiene una factura autorizada.");

    const sriUrls = getSriUrls(storeConfig.eInvoicingEnvironment);
    const taxRateCode = storeConfig.taxRate === 12 ? '2' : (storeConfig.taxRate === 15 ? '4' : '0');
    const secuencial = String(storeConfig.nextInvoiceNumber).padStart(9, '0');
    
    // Preparar infoTributaria
    const infoTributaria: any = {
      ambiente: storeConfig.eInvoicingEnvironment,
      tipoEmision: '1' as const,
      razonSocial: storeConfig.legalName,
      ruc: storeConfig.address.ruc,
      codDoc: '01' as const,
      estab: '001',
      ptoEmi: '001',
      secuencial: secuencial,
      dirMatriz: storeConfig.address.street,
    };
    
    const invoiceData = {
        factura: {
            infoTributaria,
            infoFactura: {
                fechaEmision: new Date(order.date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                dirEstablecimiento: storeConfig.address.street,
                obligadoContabilidad: 'SI' as const,
                tipoIdentificacionComprador: '05' as const, // Cédula por defecto
                razonSocialComprador: order.customerName,
                identificacionComprador: order.identification || '9999999999',
                totalSinImpuestos: order.subtotal.toFixed(2),
                totalDescuento: order.discountAmount.toFixed(2),
                totalConImpuestos: {
                    totalImpuesto: [
                    {
                        codigo: '2' as const,
                        codigoPorcentaje: taxRateCode,
                        baseImponible: (order.subtotal - order.discountAmount).toFixed(2),
                        valor: order.taxAmount?.toFixed(2) || '0.00',
                    },
                    ],
                },
                propina: '0.00',
                importeTotal: order.total.toFixed(2),
                moneda: 'DOLAR',
                pagos: {
                    pago: [
                    {
                        formaPago: '20',
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
                        precioUnitario: item.price.toFixed(2),
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
            infoAdicional: {
                campoAdicional: [
                    {
                        "@nombre": "email",
                        "#": order.email
                    }
                ]
            }
        }
    };
    
    const { xml, accessKey } = generateInvoice(invoiceData as any);
    
    const signatureBuffer = Buffer.from(storeConfig.eSignatureFile, 'base64');
    const signedXml = await signXml(signatureBuffer, process.env.E_SIGNATURE_PASSWORD, xml);

    const receptionResult = await documentReception(signedXml, sriUrls.reception);
    const receptionState = receptionResult?.RespuestaRecepcionComprobante?.estado;
    
    if (receptionState !== 'RECIBIDA') {
        const errorMessage = receptionResult?.RespuestaRecepcionComprobante?.comprobantes?.comprobante?.mensajes?.mensaje?.informacionAdicional || 'Error en la recepción.';
        console.error("SRI Reception Error Details:", JSON.stringify(receptionResult, null, 2));
        throw new Error(`SRI: ${errorMessage}`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        const authorizationResult = await documentAuthorization(accessKey, sriUrls.authorization);
        const authorization = authorizationResult?.autorizaciones?.autorizacion;
        
        if (!authorization || authorization.estado !== 'AUTORIZADO') {
            console.error("SRI Authorization Error Details:", JSON.stringify(authorizationResult, null, 2));
            const errorMessage = authorization?.mensajes?.mensaje?.informacionAdicional || 'No autorizado.';
            await query('UPDATE orders SET "eInvoiceStatus" = $1, "eInvoiceAuthorization" = $2 WHERE id = $3', ['REJECTED', JSON.stringify(authorization?.mensajes), orderId]);
            throw new Error(`SRI: ${errorMessage}`);
        }

        const authorizationNumber = authorization.numeroAutorizacion;

        await query('UPDATE orders SET "eInvoiceStatus" = $1, "eInvoiceAuthorization" = $2 WHERE id = $3', ['AUTHORIZED', authorizationNumber, orderId]);
        await updateStoreConfigInDb({ ...storeConfig, nextInvoiceNumber: storeConfig.nextInvoiceNumber + 1 });

        const pdfBuffer = await generateRidePdf(order, storeConfig, authorizationNumber, allProducts);
        
        revalidatePath('/admin/pedidos');
        return { success: true, pdfBuffer };

    } catch(authError) {
        const message = authError instanceof Error ? authError.message : 'Error desconocido durante la autorización.';
        console.error("Error during authorization step:", message);
        throw new Error(message);
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    console.error("E-Invoice Error:", message);
    await query('UPDATE orders SET "eInvoiceStatus" = $1, "eInvoiceAuthorization" = $2 WHERE id = $3', ['ERROR', message, orderId]);
    return { success: false, message };
  }
}
