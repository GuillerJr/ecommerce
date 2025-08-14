/**
 * @fileoverview Página del lado del servidor para la gestión de productos.
 * Obtiene todos los datos relacionados con productos (productos, categorías, etc.)
 * y los pasa al componente cliente.
 */

import { getProductsFromDb as getProducts } from "@/lib/data/products";
import { getCategories, getSubcategories } from "@/lib/data/categories";
import { getBrandsFromDb as getBrands } from "@/lib/data/brands";
import ProductsPageClient from "@/components/admin/ProductsPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de productos.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de productos.
 */
export default async function AdminProductsPage() {
  // Obtiene todos los datos necesarios para el formulario de producto y los filtros.
  const products = await getProducts();
  const categories = await getCategories();
  const subcategories = await getSubcategories();
  const brands = await getBrands();

  // Renderiza el componente cliente, que se encargará de toda la lógica de la UI.
  return <ProductsPageClient 
    initialProducts={products} 
    allCategories={categories} 
    allSubcategories={subcategories}
    allBrands={brands}
  />;
}
