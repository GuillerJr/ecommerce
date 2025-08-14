/**
 * @fileoverview Página del lado del servidor para la gestión de subcategorías.
 * Obtiene todas las subcategorías y las categorías padre para el formulario y filtrado.
 */

import { getSubcategories, getCategories } from "@/lib/data/categories";
import SubcategoriesPageClient from "@/components/admin/SubcategoriesPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de subcategorías.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de subcategorías.
 */
export default async function AdminSubcategoriesPage() {
  // Obtiene todas las subcategorías y categorías.
  const subcategories = await getSubcategories();
  const categories = await getCategories();
  
  // Renderiza el componente cliente con los datos necesarios.
  return <SubcategoriesPageClient initialSubcategories={subcategories} allCategories={categories} />;
}
