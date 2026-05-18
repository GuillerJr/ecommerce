

'use server';

import type { Order, CartItem } from '@/types';
import { createOrderInDb, updateOrderStatusInDb, getOrdersFromDb } from '@/lib/data/orders';
import { revalidatePath } from 'next/cache';
import { logActivity } from '../data/activity';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../email.server';
import { getUserById } from '../data/users';
import { getClient, query } from '../db.server';
import { generateEInvoiceAction } from './einvoice';
import { getStoreConfigFromDb } from '../data/store';
import { getProductsFromDb } from '../data/products';
import { generateRidePdf } from '../einvoice/ride';
import { requirePermission, requireUser } from '@/lib/auth/session';


export async function checkStockAction(items: CartItem[]): Promise<{ success: boolean; message?: string }> {
  if (!items || items.length === 0) {
    return { success: true };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const stockChecks = items.map(item =>
      client.query('SELECT name, stock, "saleType", status FROM products WHERE id = $1 FOR UPDATE', [item.product.id])
    );
    const results = await Promise.all(stockChecks);
    
    const insufficientStockItems: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const productRes = results[i];
      if (productRes.rows.length === 0) {
        insufficientStockItems.push(`${item.product.name} (no encontrado)`);
        continue;
      }
      const product = productRes.rows[0];
      if (product.status !== 'Activo') {
        insufficientStockItems.push(`${product.name} (inactivo)`);
        continue;
      }
      if (product.saleType === 'stock') {
        const currentStock = product.stock;
        if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0 || currentStock < item.quantity) {
          insufficientStockItems.push(`${product.name} (solicitado: ${item.quantity}, disponible: ${currentStock})`);
        }
      }
    }

    if (insufficientStockItems.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, message: `Los siguientes productos no tienen stock suficiente: ${insufficientStockItems.join(', ')}.` };
    }

    await client.query('ROLLBACK'); // We only check, not commit any changes
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error checking stock:", error);
    return { success: false, message: "Ocurrió un error al verificar el stock." };
  } finally {
    client.release();
  }
}


export async function createOrderAction(orderData: { userId?: string, customerName: string, email: string, phone?: string, identification?: string, shippingAddress?: any, paymentMethod: 'PayPal' | 'Transferencia Bancaria' | 'Punto de Venta'}, items: any[], taxRate: number, couponCode?: string) {
    try {
        const currentUser = await requireUser();
        const storeConfig = await getStoreConfigFromDb();
        const isPosSale = orderData.paymentMethod === 'Punto de Venta';
        if (isPosSale) {
            await requirePermission('manage_pos');
        }
        const trustedOrderData = {
            ...orderData,
            userId: isPosSale ? orderData.userId : currentUser.id,
            email: isPosSale ? orderData.email : currentUser.email,
            customerName: isPosSale ? orderData.customerName : currentUser.name,
            identification: isPosSale ? orderData.identification : currentUser.identification,
        };
        const order = await createOrderInDb(trustedOrderData, items, storeConfig.taxRate || 0, couponCode);
        
        let eInvoicePdfBuffer: Buffer | undefined;

        // --- E-Invoice Generation ---
        if (storeConfig.isEInvoicingEnabled) {
            try {
                const allProducts = await getProductsFromDb();
                const eInvoiceResult = await generateEInvoiceAction(order.id, allProducts);
                if (eInvoiceResult.success && eInvoiceResult.pdfBuffer) {
                    eInvoicePdfBuffer = eInvoiceResult.pdfBuffer;
                } else {
                  console.error("E-Invoice generation failed, generating generic receipt.", eInvoiceResult.message);
                  const allProducts = await getProductsFromDb();
                  const sequentialNumber = (await query<{nextInvoiceNumber: number}>('SELECT "nextInvoiceNumber" FROM store_config WHERE id=1'))[0].nextInvoiceNumber - 1;
                  eInvoicePdfBuffer = await generateRidePdf(order, storeConfig, null, allProducts, String(sequentialNumber).padStart(9, '0'));
                }
            } catch (eInvoiceError: any) {
                console.error(`Failed to generate e-invoice for order ${order.id}:`, eInvoiceError.message);
                 const allProducts = await getProductsFromDb();
                 eInvoicePdfBuffer = await generateRidePdf(order, storeConfig, null, allProducts, order.id.substring(0,9));
            }
        } else {
             const allProducts = await getProductsFromDb();
             eInvoicePdfBuffer = await generateRidePdf(order, storeConfig, null, allProducts, order.id.substring(0,9));
        }
        // --- End E-Invoice Generation ---

        // Only sends confirmation email if it's not a placeholder POS email
        if (!order.email.endsWith('@hacktrick.store')) {
            await sendOrderConfirmationEmail(order, eInvoicePdfBuffer);
        }

        revalidatePath('/pedidos');
        revalidatePath('/admin/pedidos');
        revalidatePath('/admin/dashboard');
        return { success: true, order: JSON.parse(JSON.stringify(order)) };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        console.error("Error creating order in createOrderAction:", errorMessage);
        return { success: false, message: `Error al crear el pedido: ${errorMessage}` };
    }
}

export async function updateOrderStatusAction(orderId: string, newStatus: Order['status'], adminUserId: string) {
    try {
        const adminUser = await requirePermission('manage_orders');
        const order = await updateOrderStatusInDb(orderId, newStatus);
        
        if (!order) {
            return { success: false, message: 'No se encontró el pedido a actualizar.' };
        }

        // Only sends update email if it's not a placeholder POS email
        if (!order.email.endsWith('@hacktrick.store')) {
            await sendOrderStatusUpdateEmail(order);
        }

        revalidatePath('/pedidos');
        revalidatePath('/admin/pedidos');
        revalidatePath('/admin/dashboard');
        
        await logActivity({
            userId: adminUser.id,
            userName: adminUser.name,
            action: 'update_status',
            entityType: 'Order',
            entityId: orderId,
            details: { newStatus }
        });

        return { success: true, order: JSON.parse(JSON.stringify(order)) };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al actualizar el estado del pedido';
        return { success: false, message };
    }
}

export async function getOrdersAction() {
    try {
        const currentUser = await requireUser();
        const orders = await getOrdersFromDb();
        const visibleOrders = currentUser.permissions?.all || currentUser.permissions?.manage_orders || currentUser.role !== 'user'
            ? orders
            : orders.filter(order => order.userId === currentUser.id);
        return { success: true, orders: JSON.parse(JSON.stringify(visibleOrders)) };
    } catch (error) {
        return { success: false, message: 'Error al obtener los pedidos' };
    }
}
