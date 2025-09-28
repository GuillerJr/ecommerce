/**
 * @fileoverview Generates a PDF representation of an electronic document (RIDE)
 * using jspdf and jspdf-autotable.
 */
'use server';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, StoreConfig, Product } from '@/types';
import { format } from 'date-fns';

export async function generateRidePdf(
  order: Order,
  storeConfig: StoreConfig,
  authorizationNumber: string | null,
  allProducts: Product[],
  usedSequential: string
): Promise<Buffer> {
    const doc = new jsPDF();
    const getProductById = (id: string) => allProducts.find(p => p.id === id);

    // Header Section
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(storeConfig.name, 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(storeConfig.legalName || storeConfig.name, 14, 30);
    doc.text(`RUC: ${storeConfig.address.ruc}`, 14, 35);
    doc.text(storeConfig.address.street, 14, 40);
    doc.text(`${storeConfig.address.city}, ${storeConfig.address.country}`, 14, 45);

    // RIDE Box Section
    const rideBoxX = 110;
    const rideBoxY = 15;
    doc.rect(rideBoxX, rideBoxY, 85, 40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', rideBoxX + 5, rideBoxY + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`No. 001-001-${usedSequential}`, rideBoxX + 5, rideBoxY + 14);

    if (authorizationNumber) {
        doc.setFontSize(7);
        doc.text('NÚMERO DE AUTORIZACIÓN:', rideBoxX + 5, rideBoxY + 21);
        doc.text(authorizationNumber, rideBoxX + 5, rideBoxY + 25, { maxWidth: 75 });
        doc.text(`AMBIENTE: ${storeConfig.eInvoicingEnvironment === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}`, rideBoxX + 5, rideBoxY + 33);
        doc.text('EMISIÓN: NORMAL', rideBoxX + 5, rideBoxY + 37);
    } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Comprobante de Venta Sin Validez Tributaria', rideBoxX + 5, rideBoxY + 25);
    }
    

    // Customer Info Section
    const infoY = 65;
    doc.rect(14, infoY, 181, 20);
    doc.setFontSize(10);
    doc.text(`Razón Social / Nombres: ${order.customerName}`, 16, infoY + 7);
    doc.text(`Identificación: ${order.identification || '9999999999'}`, 16, infoY + 14);
    doc.text(`Fecha Emisión: ${format(new Date(order.date), 'dd/MM/yyyy')}`, 130, infoY + 14);

    // Items Table
    const body = order.items.map(item => {
        const product = getProductById(item.productId);
        return [
            item.productId.substring(0, 10),
            product?.name || 'Producto no encontrado',
            item.quantity.toString(),
            `$${item.price.toFixed(2)}`,
            `$${(item.price * item.quantity).toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: infoY + 25,
        head: [['Cod. Principal', 'Descripción', 'Cant.', 'P. Unitario', 'P. Total']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
    });

    // Totals Section
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalsX = 110;
    doc.setFontSize(10);

    let currentY = finalY + 10;

    doc.text('SUBTOTAL IVA ' + storeConfig.taxRate + '%:', totalsX, currentY);
    doc.text(`$${(order.subtotal - order.discountAmount).toFixed(2)}`, 185, currentY, { align: 'right' });
    currentY += 7;

    doc.text('SUBTOTAL 0%:', totalsX, currentY);
    doc.text('$0.00', 185, currentY, { align: 'right' });
    currentY += 7;

    doc.text('DESCUENTO:', totalsX, currentY);
    doc.text(`$${order.discountAmount.toFixed(2)}`, 185, currentY, { align: 'right' });
    currentY += 7;

    doc.text('VALOR IVA ' + storeConfig.taxRate + '%:', totalsX, currentY);
    doc.text(`$${(order.taxAmount || 0).toFixed(2)}`, 185, currentY, { align: 'right' });
    currentY += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('VALOR TOTAL:', totalsX, currentY);
    doc.text(`$${order.total.toFixed(2)}`, 185, currentY, { align: 'right' });

    // Output as Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
}
