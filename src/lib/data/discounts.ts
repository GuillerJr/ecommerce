
'use server';

import type { Discount } from '@/types';
import { query } from '@/lib/db.server';
import { getClient } from '@/lib/db.server';

export async function getDiscounts(): Promise<Discount[]> {
    const queryText = `
        SELECT 
            d.*, 
            COALESCE(
                (SELECT json_agg(pd."productId") FROM product_discounts pd WHERE pd."discountId" = d.id), 
                '[]'
            ) as "applicableProductIds"
        FROM discounts d
        ORDER BY d.name;
    `;
    const result = await query<any>(queryText);
    return result.map(row => ({
        ...row,
        applicableProductIds: row.applicableProductIds,
    }));
}

export async function getDiscountById(id: string): Promise<Discount | null> {
    const queryText = `
        SELECT 
            d.*, 
            COALESCE(
                (SELECT json_agg(pd."productId") FROM product_discounts pd WHERE pd."discountId" = d.id), 
                '[]'
            ) as "applicableProductIds"
        FROM discounts d
        WHERE d.id = $1;
    `;
    const result = await query<any>(queryText, [id]);
    const row = result[0];
    if (!row) return null;
    return {
        ...row,
        applicableProductIds: row.applicableProductIds,
    };
}

export async function addDiscountToDb(discountData: Omit<Discount, 'id' | 'uses'>): Promise<Discount> {
    const { name, type, value, applicableProductIds, status, endDate, maxUses } = discountData;
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const discountQuery = 'INSERT INTO discounts (name, type, value, status, "endDate", "maxUses") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const discountValues = [name, type, value, status, endDate, maxUses];
        const discountResult = await client.query(discountQuery, discountValues);
        const newDiscount = discountResult.rows[0];

        if (applicableProductIds && applicableProductIds.length > 0) {
            const productDiscountQuery = 'INSERT INTO product_discounts ("discountId", "productId") VALUES ($1, $2)';
            for (const productId of applicableProductIds) {
                await client.query(productDiscountQuery, [newDiscount.id, productId]);
            }
        }
        
        await client.query('COMMIT');
        
        // Return the complete discount object including the product IDs
        const finalDiscount = await getDiscountById(newDiscount.id);
        if (!finalDiscount) throw new Error("Failed to retrieve the newly created discount.");
        return finalDiscount;
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in addDiscountToDb:", e);
        throw e;
    } finally {
        client.release();
    }
}

export async function updateDiscountInDb(discount: Discount): Promise<void> {
    const { id, name, type, value, applicableProductIds, status, endDate, maxUses } = discount;
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const discountQuery = 'UPDATE discounts SET name = $1, type = $2, value = $3, status = $4, "endDate" = $5, "maxUses" = $6 WHERE id = $7';
        const discountValues = [name, type, value, status, endDate, maxUses, id];
        await client.query(discountQuery, discountValues);

        await client.query('DELETE FROM product_discounts WHERE "discountId" = $1', [id]);

        if (applicableProductIds && applicableProductIds.length > 0) {
            const productDiscountQuery = 'INSERT INTO product_discounts ("discountId", "productId") VALUES ($1, $2)';
            for (const productId of applicableProductIds) {
                await client.query(productDiscountQuery, [id, productId]);
            }
        }
        
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in updateDiscountInDb:", e);
        throw e;
    } finally {
        client.release();
    }
}

export async function deleteDiscountFromDb(id: string): Promise<void> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        await client.query("UPDATE discounts SET status = 'Inactivo' WHERE id = $1", [id]);
        // Optionally, you might want to delete from product_discounts as well,
        // but marking as Inactive might be sufficient.
        // await client.query('DELETE FROM product_discounts WHERE "discountId" = $1', [id]);
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in deleteDiscountFromDb:", e);
        throw e;
    } finally {
        client.release();
    }
}
