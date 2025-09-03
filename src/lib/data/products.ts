

'use server';

import type { Product } from '@/types';
import { query } from '@/lib/db.server';
import { cache } from 'react';

const _getProductsFromDb = async (saleType?: 'stock' | 'on_demand'): Promise<Product[]> => {
    let queryText = 'SELECT * FROM products';
    const params = [];

    // Base WHERE clause
    let whereClause = '';
    if (saleType) {
        whereClause = ' WHERE "saleType" = $1';
        params.push(saleType);
    }

    queryText += whereClause;

    // Advanced ordering:
    // 1. Prioritize items with a season tag.
    // 2. Sort by season descending (e.g., 2024-2025 before 2023-2024).
    // 3. Sort by team name alphabetically within each season.
    // 4. Sort by full name for products of the same team/season.
    queryText += `
        ORDER BY
            CASE
                WHEN name ~ 'Temporada \\d{4}-\\d{4}' THEN 1
                ELSE 2
            END,
            substring(name from 'Temporada (\\d{4}-\\d{4})') DESC,
            trim(substring(name from 'equipación(.*?)(Temporada|$)')) ASC,
            name ASC
    `;

    const result = await query<any>(queryText, params);
    return result;
}

export const getProductsFromDb = cache(_getProductsFromDb);


export async function getProductById(id: string): Promise<Product | null> {
    const result = await query<any>('SELECT * FROM products WHERE id = $1', [id]);
    const row = result[0];
    if (!row) return null;
    return row;
}

export async function addProductToDb(product: Product): Promise<Product> {
    const queryText = 'INSERT INTO products (id, name, description, "longDescription", price, "subcategoryId", "brandId", "saleType", image, images, seller, reviews, specifications, stock, status, sizes, "customizationOptions") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *';
    const values = [
        product.id,
        product.name,
        product.description,
        product.longDescription,
        product.price,
        product.subcategoryId,
        product.brandId,
        product.saleType,
        product.image,
        JSON.stringify(product.images),
        JSON.stringify(product.seller),
        JSON.stringify(product.reviews),
        JSON.stringify(product.specifications),
        product.stock,
        product.status,
        JSON.stringify(product.sizes),
        JSON.stringify(product.customizationOptions)
    ];
    const result = await query<any>(queryText, values);
    const row = result[0];
    return row;
}

export async function updateProductInDb(product: Product): Promise<void> {
    const queryText = 'UPDATE products SET name = $1, description = $2, "longDescription" = $3, price = $4, "subcategoryId" = $5, "brandId" = $6, "saleType" = $7, image = $8, images = $9, seller = $10, reviews = $11, specifications = $12, stock = $13, status = $14, sizes = $15, "customizationOptions" = $16 WHERE id = $17';
    const values = [
        product.name,
        product.description,
        product.longDescription,
        product.price,
        product.subcategoryId,
        product.brandId,
        product.saleType,
        product.image,
        JSON.stringify(product.images),
        JSON.stringify(product.seller),
        JSON.stringify(product.reviews),
        JSON.stringify(product.specifications),
        product.stock,
        product.status,
        JSON.stringify(product.sizes),
        JSON.stringify(product.customizationOptions),
        product.id
    ];
    await query(queryText, values);
}

export async function deleteProductFromDb(id: string): Promise<void> {
    const queryText = "UPDATE products SET status = 'Inactivo' WHERE id = $1";
    await query(queryText, [id]);
}






