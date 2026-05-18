
'use server';

import type { Discount, Product } from '@/types';
import { 
    addDiscountToDb, 
    updateDiscountInDb, 
    deleteDiscountFromDb, 
    getDiscountById, 
    getDiscounts 
} from '@/lib/data/discounts';
import { getProductById } from '@/lib/data/products';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';

export async function addDiscountAction(discountData: Omit<Discount, 'id' | 'uses'>) {
    try {
        await requirePermission('manage_discounts');
        const discount = await addDiscountToDb(discountData);
        revalidatePath('/admin/descuentos');

        if (discount.status === 'Activo' && Array.isArray(discount.applicableProductIds)) {
            for (const productId of discount.applicableProductIds) {
                const product = await getProductById(productId);
                if (product) {
                    // This function might need adjustment if it's used for notifications
                    // await sendNewDiscountNotificationEmail(product, discount);
                }
            }
        }

        return { success: true, discount };
    } catch (error) {
        console.error("Error in addDiscountAction:", error);
        return { success: false, message: 'Error al añadir descuento' };
    }
}

export async function updateDiscountAction(discount: Discount) {
    try {
        await requirePermission('manage_discounts');
        const existingDiscount = await getDiscountById(discount.id);
        const wasInactive = existingDiscount ? existingDiscount.status === 'Inactivo' : false;

        await updateDiscountInDb(discount);
        revalidatePath('/admin/descuentos');

        if (discount.status === 'Activo' && wasInactive && Array.isArray(discount.applicableProductIds)) {
            for (const productId of discount.applicableProductIds) {
                const product = await getProductById(productId);
                if (product) {
                   // This function might need adjustment if it's used for notifications
                   // await sendNewDiscountNotificationEmail(product, discount);
                }
            }
        }
        
        return { success: true, discount };
    } catch (error) {
        return { success: false, message: 'Error al actualizar descuento' };
    }
}

export async function deleteDiscountAction(id: string): Promise<{ success: boolean; message?: string; }> {
    try {
        await requirePermission('manage_discounts');
        await deleteDiscountFromDb(id);
        revalidatePath('/admin/descuentos');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al eliminar el descuento.' };
    }
}

export async function getDiscountsAction() {
    try {
        const discounts = await getDiscounts();
        return { success: true, discounts: JSON.parse(JSON.stringify(discounts)) };
    } catch (error) {
        return { success: false, message: 'Error al obtener los descuentos' };
    }
}
