'use server';

import type { Review } from '@/types';
import { addReviewToDb, updateReviewInDb, deleteReviewFromDb } from '@/lib/data/reviews';
import { revalidatePath } from 'next/cache';
import { requirePermission, requireUser } from '@/lib/auth/session';

export async function addReviewAction(productId: string, userId: string, reviewData: Omit<Review, 'id' | 'date' | 'status' | 'author'>) {
    try {
        const user = await requireUser();
        if (user.id !== userId) return { success: false, message: 'No autorizado.' };
        const review = await addReviewToDb(productId, { ...reviewData, author: user.name });
        revalidatePath(`/product/${productId}`);
        revalidatePath('/admin/resenas');
        return { success: true, review };
    } catch (error) {
        return { success: false, message: 'Error al añadir la reseña.' };
    }
}


export async function updateReviewAction(productId: string, review: Review) {
    try {
        await requirePermission('manage_reviews');
        const success = await updateReviewInDb(productId, review);
        if (success) {
            revalidatePath('/admin/resenas');
            revalidatePath(`/product/${productId}`);
            return { success: true };
        }
        return { success: false, message: 'No se pudo actualizar la reseña.' };
    } catch (error) {
        return { success: false, message: 'Error al actualizar la reseña.' };
    }
}

export async function deleteReviewAction(productId: string, reviewId: string): Promise<{ success: boolean; message?: string; }> {
    try {
        await requirePermission('manage_reviews');
        await deleteReviewFromDb(productId, reviewId);
        revalidatePath('/admin/resenas');
        revalidatePath(`/product/${productId}`);
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al eliminar la reseña.' };
    }
}
