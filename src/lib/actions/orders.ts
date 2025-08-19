

'use server';

import type { Order, OrderStatus, TrackingEvent, Coupon, User, CartItem, Product } from '@/types';
import { createOrderInDb, updateOrderStatusInDb, getOrdersFromDb } from '@/lib/data/orders';
import { revalidatePath } from 'next/cache';
import { logActivity } from '../data/activity';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../email.server';
import { getUserById } from '../data/users';
import { getClient } from '../db.server';
import { generateEInvoiceAction } from './einvoice';
import { getStoreConfigFromDb } from '../data/store';
import { getProductsFromDb } from '../data/products';


export async function checkStockAction(items: CartItem[]): Promise<{ success: boolean; message?: string }> {
  if (!items || items.length === 0) {
    return { success: true };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const stockChecks = items.map(item =>
      client.query('SELECT name, stock FROM products WHERE id = $1 FOR UPDATE', [item.product.id])
    );
    const results = await Promise.all(stockChecks);
    
    const insufficientStockItems: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.product.saleType === 'stock') {
        const productRes = results[i];
        if (productRes.rows.length === 0) {
          insufficientStockItems.push(`${item.product.name} (no encontrado)`);
          continue;
        }
        const currentStock = productRes.rows[0].stock;
        if (currentStock < item.quantity) {
          insufficientStockItems.push(`${item.product.name} (solicitado: ${item.quantity}, disponible: ${currentStock})`);
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
        const order = await createOrderInDb(orderData, items, taxRate, couponCode);
        
        let eInvoicePdfBuffer: Buffer | undefined;

        // --- E-Invoice Generation ---
        const storeConfig = await getStoreConfigFromDb();
        if (storeConfig.isEInvoicingEnabled) {
            try {
                const allProducts = await getProductsFromDb();
                const eInvoiceResult = await generateEInvoiceAction(order.id, allProducts);
                if (eInvoiceResult.success && eInvoiceResult.pdfBuffer) {
                    eInvoicePdfBuffer = eInvoiceResult.pdfBuffer;
                }
            } catch (eInvoiceError) {
                console.error(`Failed to generate e-invoice for order ${order.id}:`, eInvoiceError);
            }
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
        console.error("Error creating order in createOrderAction:", error);
        return { success: false, message: 'Error al crear el pedido' };
    }
}

export async function updateOrderStatusAction(orderId: string, newStatus: Order['status'], adminUserId: string) {
    try {
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
        
        const adminUser = await getUserById(adminUserId);
        if (!adminUser) {
            throw new Error("Admin user not found for logging activity.");
        }

        await logActivity({
            userId: adminUserId,
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
        const orders = await getOrdersFromDb();
        return { success: true, orders: JSON.parse(JSON.stringify(orders)) };
    } catch (error) {
        return { success: false, message: 'Error al obtener los pedidos' };
    }
}
