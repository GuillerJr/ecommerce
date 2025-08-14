

'use server';

import type { StoreConfig } from '@/types';
import { query } from '@/lib/db.server';

export async function getStoreConfigFromDb(): Promise<StoreConfig> {
    const result = await query<any>('SELECT * FROM store_config WHERE id = 1');
    const row = result[0];
    
    // Inject PayPal Client ID from environment variables
    const paymentGateways = row.paymentGateways || {};
    if (paymentGateways.paypal) {
        paymentGateways.paypal.clientId = process.env.PAYPAL_CLIENT_ID;
    }

     return {
        ...row,
        logoUrl: row.logoUrl || '',
        logoUrlDark: row.logoUrlDark || '',
        paymentGateways,
        socials: row.socials || {},
     };
}

export async function updateStoreConfigInDb(config: Omit<StoreConfig, 'id'>): Promise<StoreConfig> {
    // We don't save the clientId to the DB, so we remove it before updating.
    const { paymentGateways, ...restOfConfig } = config;
    if (paymentGateways?.paypal) {
        delete paymentGateways.paypal.clientId;
    }

    const { name, description, logoUrl, logoUrlDark, baseUrl, contactEmail, contactPhone, address, currency, socials, taxRate } = restOfConfig;
    const queryText = 'UPDATE store_config SET name = $1, description = $2, "logoUrl" = $3, "baseUrl" = $4, "contactEmail" = $5, "contactPhone" = $6, address = $7, currency = $8, socials = $9, "taxRate" = $10, "paymentGateways" = $11, "logoUrlDark" = $12 WHERE id = 1 RETURNING *';
    const values = [name, description, logoUrl, baseUrl, contactEmail, contactPhone, address, currency, socials, taxRate, paymentGateways, logoUrlDark];
    const result = await query<any>(queryText, values);
    const row = result[0];
    return {
        ...row,
        logoUrl: row.logoUrl || '',
        logoUrlDark: row.logoUrlDark || '',
     };
}
