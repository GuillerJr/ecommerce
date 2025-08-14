

'use server';

import type { Category, Subcategory } from '@/types';
import { query } from '@/lib/db.server';

export async function getCategories(): Promise<Category[]> {
    const result = await query<any>('SELECT * FROM categories');
    return result.map(row => ({
        ...row,
        iconName: row.iconName,
    }));
}

export async function getSubcategories(): Promise<Subcategory[]> {
    const result = await query<any>('SELECT * FROM subcategories');
    return result.map(row => ({
        ...row,
        categoryId: row.categoryId,
    }));
}

export async function getCategoryBySubcategoryId(subcategoryId: string): Promise<Category | null> {
    const result = await query<any>(`
        SELECT c.* FROM categories c
        JOIN subcategories s ON c.id = s."categoryId"
        WHERE s.id = $1
    `, [subcategoryId]);
    const row = result[0];
     if (!row) return null;
    return {
        ...row,
        iconName: row.iconName,
    };
}

export async function addCategoryToDb(categoryData: Omit<Category, 'id' | 'status'>): Promise<Category> {
  const { name, description, iconName } = categoryData;
  const queryText = 'INSERT INTO categories (name, description, "iconName") VALUES ($1, $2, $3) RETURNING *';
  const values = [name, description, iconName];
  const result = await query<any>(queryText, values);
  const row = result[0];
  return {
      ...row,
      iconName: row.iconName,
  };
}

export async function updateCategoryInDb(category: Category): Promise<void> {
  const { name, description, iconName, status, id } = category;
  const queryText = 'UPDATE categories SET name = $1, description = $2, "iconName" = $3, status = $4 WHERE id = $5';
  const values = [name, description, iconName, status, id];
  await query(queryText, values);
}

export async function deleteCategoryFromDb(id: string): Promise<void> {
    await query("UPDATE categories SET status = 'Inactivo' WHERE id = $1", [id]);
}

export async function addSubcategoryToDb(subcategoryData: Omit<Subcategory, 'id'|'status'>): Promise<Subcategory> {
    const { name, categoryId } = subcategoryData;
    const queryText = 'INSERT INTO subcategories (name, "categoryId") VALUES ($1, $2) RETURNING *';
    const values = [name, categoryId];
    const result = await query<any>(queryText, values);
    const row = result[0];
    return {
        ...row,
        categoryId: row.categoryId,
    };
}

export async function updateSubcategoryInDb(subcategory: Subcategory): Promise<void> {
    const { name, categoryId, status, id } = subcategory;
    const queryText = 'UPDATE subcategories SET name = $1, "categoryId" = $2, status = $3 WHERE id = $4';
    const values = [name, categoryId, status, id];
    await query(queryText, values);
}

export async function deleteSubcategoryFromDb(id: string): Promise<void> {
    await query("UPDATE subcategories SET status = 'Inactivo' WHERE id = $1", [id]);
}
