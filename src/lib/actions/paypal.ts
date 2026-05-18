
'use server';

import 'dotenv/config';
import type { Address } from '@/types';

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

// Action to create a PayPal order
export async function createPaypalOrderAction(amount: string, currency: string, shippingAddress: Address) {
    try {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return { success: false, message: 'El monto de PayPal no es válido.' };
        }
        const accessToken = await getPaypalAccessToken();
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
            return { success: true, orderId: data.id };
        } else {
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
export async function capturePaypalOrderAction(orderId: string) {
    try {
        const accessToken = await getPaypalAccessToken();
        const url = `${process.env.PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'COMPLETED') {
            return { success: true, captureData: data };
        } else {
            console.error('PayPal Capture Error:', data);
            return { success: false, message: data.message || 'Failed to capture PayPal payment.' };
        }
    } catch(error) {
        console.error('Server error capturing PayPal payment:', error);
        return { success: false, message: 'An unexpected server error occurred.' };
    }
}
