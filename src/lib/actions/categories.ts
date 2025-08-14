'use server';

import type { Category, Subcategory } from '@/types';
import { 
    addCategoryToDb, 
    updateCategoryInDb, 
    deleteCategoryFromDb, 
    addSubcategoryToDb, 
    updateSubcategoryInDb,
    deleteSubcategoryFromDb,
    getCategories,
    getSubcategories
} from '@/lib/data/categories';
import { revalidatePath } from 'next/cache';

export async function addCategoryAction(categoryData: Omit<Category, 'id' | 'status'>) {
  try {
    const category = await addCategoryToDb(categoryData);
    revalidatePath('/admin/categorias');
    return { success: true, category };
  } catch (error) {
    return { success: false, message: 'Error al añadir categoría' };
  }
}

export async function updateCategoryAction(category: Category) {
  try {
    await updateCategoryInDb(category);
    revalidatePath('/admin/categorias');
    return { success: true, category };
  } catch (error) {
    return { success: false, message: 'Error al actualizar categoría' };
  }
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean; message?: string; }> {
    try {
        await deleteCategoryFromDb(id);
        revalidatePath('/admin/categorias');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al eliminar la categoría.' };
    }
}

export async function addSubcategoryAction(subcategoryData: Omit<Subcategory, 'id'|'status'>) {
    try {
        const subcategory = await addSubcategoryToDb(subcategoryData);
        revalidatePath('/admin/subcategorias');
        return { success: true, subcategory };
    } catch (error) {
        return { success: false, message: 'Error al añadir subcategoría' };
    }
}

export async function updateSubcategoryAction(subcategory: Subcategory) {
    try {
        await updateSubcategoryInDb(subcategory);
        revalidatePath('/admin/subcategorias');
        return { success: true, subcategory };
    } catch (error) {
        return { success: false, message: 'Error al actualizar subcategoría' };
    }
}

export async function deleteSubcategoryAction(id: string): Promise<{ success: boolean; message?: string; }> {
    try {
        await deleteSubcategoryFromDb(id);
        revalidatePath('/admin/subcategorias');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al eliminar la subcategoría.' };
    }
}

export async function getCategoriesAndSubcategoriesAction() {
  try {
    const categories = await getCategories();
    const subcategories = await getSubcategories();
    return { 
        success: true, 
        categories: JSON.parse(JSON.stringify(categories.filter(c => c.status === 'Activo'))), 
        subcategories: JSON.parse(JSON.stringify(subcategories.filter(s => s.status === 'Activo'))) 
    };
  } catch (error) {
    return { success: false, message: 'Error al obtener categorías y subcategorías' };
  }
}
