

'use server';

import type { Order, OrderStatus, TrackingEvent, Coupon, User } from '@/types';
import { query } from '@/lib/db.server';
import { getClient } from '@/lib/db.server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Convierte una fila de la base de datos en un objeto Order.
 * Asegura que los campos JSONB y las convenciones de nomenclatura se manejen correctamente.
 * @param {any} row - La fila de la base de datos.
 * @returns {Order} El objeto de pedido formateado.
 */
const parseOrder = (row: any): Order => {
  return {
    id: row.id,
    userId: row.userId,
    customerName: row.customerName,
    email: row.email,
    phone: row.phone,
    identification: row.identification,
    shippingAddress: row.shippingAddress,
    date: row.date,
    subtotal: row.subtotal,
    discountAmount: row.discountAmount,
    taxAmount: row.taxAmount,
    taxRate: row.taxRate,
    couponCode: row.couponCode,
    total: row.total,
    status: row.status,
    items: row.items,
    trackingHistory: row.trackingHistory || [],
    paymentMethod: row.paymentMethod,
    eInvoiceStatus: row.eInvoiceStatus,
    eInvoiceAuthorization: row.eInvoiceAuthorization,
  };
};

export async function getOrdersFromDb(): Promise<Order[]> {
    const result = await query<any>('SELECT * FROM orders ORDER BY date DESC');
    return result.map(parseOrder);
}
export async function getOrderByIdFromDb(id: string): Promise<Order | null> {
    const result = await query<any>('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.length === 0) return null;
    return parseOrder(result[0]);
}


export async function updateOrderStatusInDb(orderId: string, newStatus: OrderStatus): Promise<Order | null> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (orderRes.rows.length === 0) {
            throw new Error('Pedido no encontrado');
        }

        const order = parseOrder(orderRes.rows[0]);
        const newTrackingEvent: TrackingEvent = {
            status: newStatus,
            date: new Date().toISOString(),
            description: `El estado del pedido fue actualizado a ${newStatus}.`,
        };
        const trackingHistory = [...(order.trackingHistory || []), newTrackingEvent];

        const updateRes = await client.query('UPDATE orders SET status = $1, "trackingHistory" = $2 WHERE id = $3 RETURNING *', [newStatus, JSON.stringify(trackingHistory), orderId]);
        await client.query('COMMIT');
        
        const row = updateRes.rows[0];
        // Manually map snake_case to camelCase for the returned row
        return parseOrder({
            ...row,
        });

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function createOrderInDb(orderData: any, items: any[], taxRate: number, couponCode?: string): Promise<Order> {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Lock and check stock for all products in the cart
        for (const item of items) {
            if (item.product.saleType === 'stock') {
                const productRes = await client.query('SELECT name, stock FROM products WHERE id = $1 FOR UPDATE', [item.product.id]);
                if (productRes.rows.length === 0) {
                    throw new Error(`El producto "${item.product.name}" ya no está disponible.`);
                }
                const currentStock = productRes.rows[0].stock;
                if (currentStock < item.quantity) {
                    throw new Error(`Stock insuficiente para "${item.product.name}". Disponible: ${currentStock}, solicitado: ${item.quantity}.`);
                }
            }
        }
        
        let subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let discountAmount = 0;
        let coupon: Coupon | null = null;
        if (couponCode) {
            const couponResult = await client.query('SELECT * FROM coupons WHERE code = $1 AND status = \'Activo\' AND ("expiryDate" IS NULL OR "expiryDate" > NOW()) AND ("maxUses" IS NULL OR uses < "maxUses")', [couponCode]);
            coupon = couponResult.rows[0];
            if (coupon) {
                if (coupon.type === 'Fijo') {
                    discountAmount = coupon.value || 0;
                } else if (coupon.type === 'Porcentaje') {
                    discountAmount = subtotal * ((coupon.value || 0) / 100);
                }
            }
        }
        
        const priceAfterDiscount = subtotal - discountAmount;
        const taxAmount = taxRate > 0 ? priceAfterDiscount * (taxRate / 100) : 0;
        const total = Math.max(0, priceAfterDiscount + taxAmount);

        const orderId = uuidv4();
        
        const isPosSale = orderData.paymentMethod === 'Punto de Venta';
        const initialStatus: OrderStatus = isPosSale ? 'Entregado' : 'Pendiente';
        
        const trackingHistory: TrackingEvent[] = [{
            status: initialStatus,
            date: new Date().toISOString(),
            description: isPosSale ? 'Pedido creado y entregado en punto de venta.' : 'Pedido recibido y pendiente de procesamiento.'
        }];
        
        const queryText = `
            INSERT INTO orders (
                id, "userId", "customerName", email, phone, identification, "shippingAddress", date, 
                subtotal, "discountAmount", "taxRate", "taxAmount", "couponCode", 
                total, status, items, "trackingHistory", "paymentMethod"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
            RETURNING *`;
            
        const values = [
            orderId, 
            orderData.userId || null,
            orderData.customerName, 
            orderData.email, 
            orderData.phone, 
            orderData.identification, 
            JSON.stringify(orderData.shippingAddress), 
            new Date(), 
            subtotal, 
            discountAmount, 
            taxRate, 
            taxAmount, 
            couponCode, 
            total, 
            initialStatus, 
            JSON.stringify(items.map(i => ({ 
                productId: i.product.id, 
                quantity: i.quantity, 
                price: i.price, 
                customization: i.customization 
            }))), 
            JSON.stringify(trackingHistory), 
            orderData.paymentMethod
        ];
        
        const result = await client.query<any>(queryText, values);
        
        // Now update stock and kardex for all items
        for (const item of items) {
            if (item.product.saleType === 'stock') {
                const productRes = await client.query('SELECT stock FROM products WHERE id = $1', [item.product.id]);
                const newStock = productRes.rows[0].stock - item.quantity;
                await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, item.product.id]);
                await client.query('INSERT INTO kardex ("productId", "productName", date, type, quantity, balance, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [item.product.id, item.product.name, new Date(), 'Salida', item.quantity, newStock, `Venta - Pedido #${orderId.substring(0,8)}`]);
            }
        }
        
        if (coupon) {
            await client.query('UPDATE coupons SET uses = uses + 1 WHERE id = $1', [coupon.id]);
        }

        await client.query('COMMIT');

        const row = result.rows[0];
         return parseOrder({
            ...row,
        });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in createOrderInDb:", e);
        throw e;
    } finally {
        client.release();
    }
}