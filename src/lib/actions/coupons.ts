'use server';

import type { Coupon } from '@/types';
import { addCouponToDb, updateCouponInDb, deleteCouponFromDb, getCouponByCodeFromDb } from '@/lib/data/coupons';
import { revalidatePath } from 'next/cache';

export async function addCouponAction(coupon: Omit<Coupon, 'id' | 'uses'>) {
    try {
        await addCouponToDb(coupon);
        revalidatePath('/admin/cupones');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al añadir cupón' };
    }
}

export async function updateCouponAction(coupon: Coupon) {
    try {
        await updateCouponInDb(coupon);
        revalidatePath('/admin/cupones');
        return { success: true, coupon };
    } catch (error) {
        return { success: false, message: 'Error al actualizar cupón' };
    }
}

export async function deleteCouponAction(id: string): Promise<{ success: boolean; message?: string; }> {
    try {
        await deleteCouponFromDb(id);
        revalidatePath('/admin/cupones');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al eliminar el cupón.' };
    }
}

export async function getCouponByCodeAction(code: string) {
    try {
        const coupon = await getCouponByCodeFromDb(code);
        return { success: true, coupon: coupon ? JSON.parse(JSON.stringify(coupon)) : null };
    } catch (error) {
        return { success: false, message: 'Error al obtener cupón' };
    }
}
