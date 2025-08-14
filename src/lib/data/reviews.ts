'use server';

import type { Review, ProductReview } from '@/types';
import { query } from '@/lib/db.server';
import { getClient } from '@/lib/db.server';
import { v4 as uuidv4 } from 'uuid';
import { getProductsFromDb } from './products';

export async function getAllReviews(): Promise<ProductReview[]> {
    const products = await getProductsFromDb();
    const allReviews: ProductReview[] = [];
    products.forEach(p => {
        p.reviews.forEach(r => {
            allReviews.push({
                ...r,
                productId: p.id,
                productName: p.name,
                productImage: p.image,
            });
        });
    });
    return allReviews.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addReviewToDb(productId: string, reviewData: Omit<Review, 'id' | 'date' | 'status'>): Promise<Review | null> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT reviews FROM products WHERE id = $1', [productId]);
        if (productRes.rows.length === 0) {
            throw new Error('Producto no encontrado');
        }

        const review: Review = { ...reviewData, id: uuidv4(), date: new Date().toISOString(), status: 'Visible' };
        const reviews = [...productRes.rows[0].reviews, review];

        await client.query('UPDATE products SET reviews = $1 WHERE id = $2', [JSON.stringify(reviews), productId]);
        await client.query('COMMIT');
        return review;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function updateReviewInDb(productId: string, review: Review): Promise<boolean> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT reviews FROM products WHERE id = $1', [productId]);
        if (productRes.rows.length === 0) {
            throw new Error('Producto no encontrado');
        }

        const reviews = productRes.rows[0].reviews.map((r: Review) => (r.id === review.id ? review : r));

        await client.query('UPDATE products SET reviews = $1 WHERE id = $2', [JSON.stringify(reviews), productId]);
        await client.query('COMMIT');
        return true;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function deleteReviewFromDb(productId: string, reviewId: string): Promise<void> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT reviews FROM products WHERE id = $1', [productId]);
        if (productRes.rows.length === 0) {
            throw new Error('Producto no encontrado');
        }

        const reviews = productRes.rows[0].reviews.filter((r: Review) => r.id !== reviewId);
        await client.query('UPDATE products SET reviews = $1 WHERE id = $2', [JSON.stringify(reviews), productId]);
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
