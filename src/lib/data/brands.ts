'use server';

import type { Brand } from '@/types';
import { query } from '@/lib/db.server';

export async function addBrandToDb(brandData: Omit<Brand, 'id' | 'status'>): Promise<Brand> {
    const { name, description } = brandData;
    const queryText = 'INSERT INTO brands (name, description) VALUES ($1, $2) RETURNING *';
    const values = [name, description];
    const result = await query<Brand>(queryText, values);
    return result[0];
}

export async function updateBrandInDb(brand: Brand): Promise<void> {
    const { name, description, status, id } = brand;
    const queryText = 'UPDATE brands SET name = $1, description = $2, status = $3 WHERE id = $4';
    const values = [name, description, status, id];
    await query(queryText, values);
}

export async function getBrandsFromDb(): Promise<Brand[]> {
    return await query<Brand>('SELECT * FROM brands ORDER BY name');
}

export async function deleteBrandFromDb(id: string): Promise<void> {
    await query("UPDATE brands SET status = 'Inactivo' WHERE id = $1", [id]);
}
