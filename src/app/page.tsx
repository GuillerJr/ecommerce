
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
import type { Product } from '@/types';

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

  // Lógica para ordenar los productos destacados (Novedades)
  const featuredProducts = [...allProducts]
    .sort((a: Product, b: Product) => {
        // Prioridad 1: Mayor valoración promedio
        const ratingA = a.reviews.length > 0 ? a.reviews.reduce((sum, r) => sum + r.rating, 0) / a.reviews.length : 0;
        const ratingB = b.reviews.length > 0 ? b.reviews.reduce((sum, r) => sum + r.rating, 0) / b.reviews.length : 0;
        if (ratingA !== ratingB) {
            return ratingB - ratingA;
        }

        // Lógica para extraer la temporada y el nombre del equipo
        const getSeason = (name: string) => (name.match(/Temporada (\d{4}-\d{4})/) || [])[1] || null;
        const getTeamName = (name: string) => (name.match(/equipación(.*?)(Temporada|$)/i) || [])[1]?.trim() || name;

        const seasonA = getSeason(a.name);
        const seasonB = getSeason(b.name);

        // Prioridad 2: Temporada más reciente
        if (seasonA && seasonB) {
            if (seasonA !== seasonB) {
                return seasonB.localeCompare(seasonA); // Orden descendente para la temporada
            }
        } else if (seasonA) {
            return -1; // 'a' tiene temporada, 'b' no
        } else if (seasonB) {
            return 1; // 'b' tiene temporada, 'a' no
        }

        // Prioridad 3: Nombre del equipo alfabéticamente
        const teamA = getTeamName(a.name);
        const teamB = getTeamName(b.name);
        if (teamA !== teamB) {
            return teamA.localeCompare(teamB);
        }

        // Prioridad 4 (fallback): Nombre completo del producto
        return a.name.localeCompare(b.name);
    })
    .slice(0, 10);


  return (
    // Suspense muestra un estado de carga mientras se obtienen los datos.
    <Suspense fallback={<div className="flex justify-center items-center h-dvh">Cargando...</div>}>
      {/* Pasa los datos obtenidos al componente cliente que se encargará de la renderización. */}
      <HomePageContentClient 
        allProducts={allProducts} 
        allCategories={allCategories} 
        allSubcategories={allSubcategories} 
        allDiscounts={allDiscounts} 
        allBrands={allBrands}
        featuredProducts={featuredProducts}
      />
    </Suspense>
  );
}
