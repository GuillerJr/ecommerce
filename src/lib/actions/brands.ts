'use server';

import { addBrandToDb, updateBrandInDb, getBrandsFromDb, deleteBrandFromDb } from '@/lib/data/brands';
import { revalidatePath } from 'next/cache';
import type { Brand } from '@/types';
import { requirePermission } from '@/lib/auth/session';

export async function addBrandAction(brandData: Omit<Brand, 'id' | 'status'>) {
    try {
        await requirePermission('manage_categories');
        await addBrandToDb(brandData);
        revalidatePath('/admin/marcas');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al añadir la marca.' };
    }
}

export async function updateBrandAction(brand: Brand) {
    try {
        await requirePermission('manage_categories');
        await updateBrandInDb(brand);
        revalidatePath('/admin/marcas');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al actualizar la marca.' };
    }
}

export async function getBrandsAction() {
    try {
        const brands = await getBrandsFromDb();
        return { success: true, brands: JSON.parse(JSON.stringify(brands.filter(b => b.status === 'Activo'))) };
    } catch (error) {
        return { success: false, message: 'Error al obtener las marcas' };
    }
}

export async function deleteBrandAction(id: string): Promise<{ success: boolean; message?: string; }> {
    try {
        await requirePermission('manage_categories');
        await deleteBrandFromDb(id);
        revalidatePath('/admin/marcas');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al desactivar la marca.' };
    }
}
