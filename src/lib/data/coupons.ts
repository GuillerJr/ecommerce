
'use server';

import type { Coupon } from '@/types';
import { query } from '@/lib/db.server';

export async function getCoupons(): Promise<Coupon[]> {
    const result = await query<any>('SELECT * FROM coupons');
    return result;
}

export async function addCouponToDb(coupon: Omit<Coupon, 'id' | 'uses'>): Promise<Coupon> {
    const { code, type, value, maxUses, status, expiryDate } = coupon;
    const queryText = 'INSERT INTO coupons (code, type, value, "maxUses", status, "expiryDate") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [code, type, value, maxUses, status, expiryDate];
    const result = await query<any>(queryText, values);
    const row = result[0];
    return row;
}

export async function updateCouponInDb(coupon: Coupon): Promise<void> {
    const { code, type, value, maxUses, status, expiryDate, id } = coupon;
    const queryText = 'UPDATE coupons SET code = $1, type = $2, value = $3, "maxUses" = $4, status = $5, "expiryDate" = $6 WHERE id = $7';
    const values = [code, type, value, maxUses, status, expiryDate, id];
    await query(queryText, values);
}

export async function deleteCouponFromDb(id: string): Promise<void> {
    await query("UPDATE coupons SET status = 'Inactivo' WHERE id = $1", [id]);
}

export async function getCouponByCodeFromDb(code: string): Promise<Coupon | null> {
    const result = await query<any>('SELECT * FROM coupons WHERE code = $1 AND status = \'Activo\' AND ("expiryDate" IS NULL OR "expiryDate" > NOW()) AND ("maxUses" IS NULL OR uses < "maxUses")', [code]);
    const row = result[0];
    if (!row) return null;
    return row;
}
