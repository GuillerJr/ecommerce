/**
 * @fileoverview Página de inicio principal de la aplicación.
 * Este es un componente del lado del servidor que obtiene los datos iniciales
 * (productos, categorías, etc.) y los pasa a un componente cliente para renderizar el contenido.
 */

import { getProductsFromDb as getProducts } from '@/lib/data/products';
import { getCategories, getSubcategories } from '@/lib/data/categories';
import { getDiscounts } from '@/lib/data/discounts';
import { getBrandsFromDb } from '@/lib/data/brands';
import HomePageContentClient from '@/components/home/HomePageContentClient';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

/**
 * Componente de la página de inicio.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de inicio.
 */
export default async function Home() {
  // Obtiene todos los datos necesarios desde la capa de datos del servidor.
  const products = await getProducts();
  const categories = await getCategories();
  const subcategories = await getSubcategories();
  const discounts = await getDiscounts();
  const brands = await getBrandsFromDb();

  // Filtra los datos para asegurarse de que solo se usen elementos activos.
  const allProducts = (products || []).filter(p => p.status === 'Activo');
  const allCategories = (categories || []).filter(c => c.status === 'Activo');
  const allSubcategories = (subcategories || []).filter(s => s.status === 'Activo');
  const allDiscounts = (discounts || []).filter(d => d.status === 'Activo');
  const allBrands = (brands || []).filter(b => b.status === 'Activo');

  return (
    // Suspense muestra un estado de carga mientras se obtienen los datos.
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Cargando...</div>}>
      {/* Pasa los datos obtenidos al componente cliente que se encargará de la renderización. */}
      <HomePageContentClient 
        allProducts={allProducts} 
        allCategories={allCategories} 
        allSubcategories={allSubcategories} 
        allDiscounts={allDiscounts} 
        allBrands={allBrands}
      />
    </Suspense>
  );
}
