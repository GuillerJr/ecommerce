'use server';

import type { KardexEntry } from '@/types';
import { query } from '@/lib/db.server';

export async function getKardex(): Promise<KardexEntry[]> {
    const result = await query<any>('SELECT * FROM kardex ORDER BY date DESC');
    return result.map(row => ({
        ...row,
        productId: row.productId,
        productName: row.productName,
    }));
}
