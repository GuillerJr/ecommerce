
'use server';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, StoreConfig, Product } from '@/types';
import { format } from 'date-fns';

export async function generateRidePdf(
  order: Order,
  storeConfig: StoreConfig,
  authorizationNumber: string,
  allProducts: Product[],
  usedSequential: string
): Promise<Buffer> {
    const doc = new jsPDF();

    const getProductById = (id: string) => allProducts.find(p => p.id === id);

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(storeConfig.name, 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`RUC: ${storeConfig.address.ruc}`, 20, 26);
    doc.text(storeConfig.address.street, 20, 31);
    doc.text(`${storeConfig.address.city}, ${storeConfig.address.country}`, 20, 36);

    // Invoice Info Box
    doc.rect(130, 15, 65, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', 135, 22);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nro. 001-001-${usedSequential}`, 135, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('NÚMERO DE AUTORIZACIÓN', 135, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(authorizationNumber, 135, 40, { maxWidth: 60 });
    

    // Customer Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Razón Social / Nombres:', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customerName, 65, 55);

    doc.setFont('helvetica', 'bold');
    doc.text('Identificación:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(order.identification || '9999999999', 65, 60);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha Emisión:', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(order.date), 'dd/MM/yyyy'), 65, 65);

    doc.setFont('helvetica', 'bold');
    doc.text('Dirección:', 20, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(order.shippingAddress?.address || 'N/A', 65, 70);
    

    // Items Table
    const tableColumn = ["Cod. Principal", "Descripción", "Cant.", "P. Unitario", "Total"];
    const tableRows: any[][] = [];

    order.items.forEach(item => {
        const product = getProductById(item.productId);
        const row = [
            item.productId.substring(0, 10),
            product?.name || 'Producto no encontrado',
            item.quantity,
            `$${item.price.toFixed(2)}`,
            `$${(item.price * item.quantity).toFixed(2)}`
        ];
        tableRows.push(row);
    });

    autoTable(doc, {
        startY: 80,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 22, 22], fontSize: 8 },
        styles: { fontSize: 8 },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Totals Section
    const totalsX = 140;
    let currentY = finalY + 10;
    doc.setFontSize(10);

    const addTotalLine = (label: string, value: string) => {
        doc.setFont('helvetica', 'normal');
        doc.text(label, totalsX, currentY, { align: 'right' });
        doc.text(value, 195, currentY, { align: 'right' });
        currentY += 6;
    };

    addTotalLine('SUBTOTAL 12%', `$${(order.subtotal - order.discountAmount).toFixed(2)}`); // Assuming all is 12%
    addTotalLine('SUBTOTAL 0%', '$0.00');
    addTotalLine('DESCUENTO', `$${order.discountAmount.toFixed(2)}`);
    addTotalLine('VALOR IVA 12%', `$${(order.taxAmount || 0).toFixed(2)}`);
    doc.setFont('helvetica', 'bold');
    addTotalLine('VALOR TOTAL', `$${order.total.toFixed(2)}`);


    return Buffer.from(doc.output('arraybuffer'));
}
