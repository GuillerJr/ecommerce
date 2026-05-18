
'use server';

import 'dotenv/config';
import type { CartItem } from '@/types';
import { requireUser } from '@/lib/auth/session';
import { createOrderInDb, attachPaypalOrderToDb, getOrderByIdFromDb, markPaypalOrderCapturedInDb, updateOrderStatusInDb } from '@/lib/data/orders';
import { getStoreConfigFromDb } from '@/lib/data/store';
import { finalizeOrderAfterPayment } from '@/lib/actions/orders';
import { checkRateLimit, getClientRateLimitKey } from '@/lib/rate-limit';

function getUserPhone(userPhone: unknown) {
    if (!userPhone) return undefined;

    try {
        const phone = typeof userPhone === 'string' ? JSON.parse(userPhone) : userPhone;
        if (phone && typeof phone === 'object' && 'countryCode' in phone && 'number' in phone) {
            return `${phone.countryCode}${phone.number}`;
        }
    } catch (error) {
        console.error('Error parsing phone for PayPal order:', error);
    }

    return undefined;
}

function getCompletedCapture(data: any) {
    return data?.purchase_units?.[0]?.payments?.captures?.find((capture: any) => capture.status === 'COMPLETED');
}

// Helper function to get PayPal access token
async function getPaypalAccessToken() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials are not configured in .env file.");
    }
    
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(`${process.env.PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `Basic ${auth}`,
        },
    });
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("PayPal Auth Error:", errorBody);
        throw new Error("Failed to get PayPal access token.");
    }
    
    const data = await response.json();
    return data.access_token;
}

// Action to create a pending local order and the matching PayPal order.
export async function createPaypalOrderAction(items: CartItem[], couponCode: string | undefined, shippingAddressId: string) {
    try {
        const currentUser = await requireUser();
        const rateLimit = await checkRateLimit({
            key: await getClientRateLimitKey('paypal-create', currentUser.id),
            limit: 10,
            windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
            return { success: false, message: `Demasiadas solicitudes de pago. Inténtalo de nuevo en ${rateLimit.retryAfterSeconds} segundos.` };
        }

        const shippingAddress = currentUser.addresses?.find(address => address.id === shippingAddressId);
        if (!shippingAddress) {
            return { success: false, message: 'La dirección de envío no pertenece al usuario actual.' };
        }

        const accessToken = await getPaypalAccessToken();
        const storeConfig = await getStoreConfigFromDb();
        const currency = storeConfig.currency?.code || 'USD';
        const order = await createOrderInDb({
            userId: currentUser.id,
            customerName: currentUser.name,
            email: currentUser.email,
            phone: getUserPhone(currentUser.phone),
            identification: currentUser.identification,
            shippingAddress,
            paymentMethod: 'PayPal',
        }, items, storeConfig.taxRate || 0, couponCode);

        const numericAmount = Number(order.total);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            await updateOrderStatusInDb(order.id, 'Cancelado');
            return { success: false, message: 'El monto de PayPal no es válido.' };
        }

        const url = `${process.env.PAYPAL_API_BASE}/v2/checkout/orders`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    custom_id: order.id,
                    invoice_id: order.id,
                    amount: {
                        currency_code: currency,
                        value: numericAmount.toFixed(2),
                    },
                    shipping: {
                        name: {
                            full_name: shippingAddress.name,
                        },
                        address: {
                            address_line_1: shippingAddress.address,
                            admin_area_2: shippingAddress.city,
                            postal_code: shippingAddress.postalCode,
                            country_code: 'US', // Using a generic country code as per PayPal's requirement.
                        }
                    }
                }],
                 application_context: {
                    shipping_preference: 'SET_PROVIDED_ADDRESS',
                },
            }),
        });

        const data = await response.json();

        if (response.ok) {
            await attachPaypalOrderToDb(order.id, data.id, currency);
            return { success: true, orderId: data.id, internalOrderId: order.id };
        } else {
            await updateOrderStatusInDb(order.id, 'Cancelado');
            console.error('PayPal API Error:', data);
            return { success: false, message: data.message || 'Failed to create PayPal order.' };
        }

    } catch (error) {
        console.error('Server error creating PayPal order:', error);
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: 'An unexpected server error occurred.' };
    }
}

// Action to capture a PayPal order
export async function capturePaypalOrderAction(paypalOrderId: string, internalOrderId: string) {
    try {
        const currentUser = await requireUser();
        const rateLimit = await checkRateLimit({
            key: await getClientRateLimitKey('paypal-capture', currentUser.id),
            limit: 10,
            windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
            return { success: false, message: `Demasiadas capturas de pago. Inténtalo de nuevo en ${rateLimit.retryAfterSeconds} segundos.` };
        }

        const pendingOrder = await getOrderByIdFromDb(internalOrderId);
        if (!pendingOrder || pendingOrder.userId !== currentUser.id) {
            return { success: false, message: 'El pedido pendiente no pertenece al usuario actual.' };
        }
        if (pendingOrder.paymentMethod !== 'PayPal' || pendingOrder.paypalOrderId !== paypalOrderId || pendingOrder.paypalCaptureId) {
            return { success: false, message: 'El pedido pendiente no coincide con la orden de PayPal.' };
        }

        const accessToken = await getPaypalAccessToken();
        const url = `${process.env.PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'COMPLETED') {
            const capture = getCompletedCapture(data);
            const captureId = capture?.id;
            const capturedAmount = Number(capture?.amount?.value);
            const capturedCurrency = capture?.amount?.currency_code;

            if (!captureId || !Number.isFinite(capturedAmount) || !capturedCurrency) {
                return { success: false, message: 'La respuesta de PayPal no incluye una captura válida.' };
            }

            const finalizedOrder = await markPaypalOrderCapturedInDb(internalOrderId, paypalOrderId, captureId, capturedAmount, capturedCurrency);
            await finalizeOrderAfterPayment(finalizedOrder);

            return { success: true, captureData: data, order: JSON.parse(JSON.stringify(finalizedOrder)) };
        } else {
            console.error('PayPal Capture Error:', data);
            return { success: false, message: data.message || 'Failed to capture PayPal payment.' };
        }
    } catch(error) {
        console.error('Server error capturing PayPal payment:', error);
        return { success: false, message: 'An unexpected server error occurred.' };
    }
}
