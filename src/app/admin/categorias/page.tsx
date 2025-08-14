/**
 * @fileoverview Página del lado del servidor para la gestión de categorías.
 * Obtiene la lista completa de categorías desde la base de datos y la pasa al componente cliente.
 */

import { getCategories } from "@/lib/data/categories";
import CategoriesPageClient from "@/components/admin/CategoriesPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de categorías.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de categorías.
 */
export default async function AdminCategoriesPage() {
  // Obtiene todas las categorías desde la fuente de datos.
  const categories = await getCategories();

  // Renderiza el componente cliente, que se encargará de la interactividad,
  // pasándole la lista inicial de categorías.
  return <CategoriesPageClient initialCategories={categories} />;
}
