/**
 * @fileoverview Página principal de la tienda.
 * Es un componente del lado del servidor que obtiene todos los datos necesarios para la tienda
 * (productos, categorías, descuentos, etc.) y los pasa al componente cliente `TiendaPageClient`,
 * que se encarga de la lógica de filtrado, ordenación y paginación.
 */

import { getProductsFromDb as getProducts } from '@/lib/data/products';
import { getSubcategories, getCategories } from '@/lib/data/categories';
import { getDiscounts } from '@/lib/data/discounts';
import { getBrandsFromDb as getBrands } from '@/lib/data/brands';
import TiendaPageClient from '@/components/tienda/TiendaPageClient';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la tienda.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de la tienda.
 */
export default async function TiendaPage() {
  // Obtiene todos los datos necesarios filtrando solo los elementos activos.
  const allProducts = (await getProducts()).filter(p => p.status === 'Activo');
  const allSubcategories = (await getSubcategories()).filter(s => s.status === 'Activo');
  const allCategories = (await getCategories()).filter(c => c.status === 'Activo');
  const activeDiscounts = (await getDiscounts()).filter((d) => d.status === 'Activo');
  const allBrands = (await getBrands()).filter(b => b.status === 'Activo');

  return (
    // Utiliza Suspense para mostrar un estado de carga mientras se obtienen los datos.
    <Suspense fallback={<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 className="font-headline text-4xl font-bold tracking-tight">Cargando Tienda...</h1></div>}>
      {/* Renderiza el componente cliente con todos los datos para la interfaz interactiva. */}
      <TiendaPageClient
        allProducts={allProducts}
        allSubcategories={allSubcategories}
        allCategories={allCategories}
        activeDiscounts={activeDiscounts}
        allBrands={allBrands}
      />
    </Suspense>
  );
}
