/**
 * @fileoverview Página del lado del servidor para la comparación de productos.
 * Obtiene los datos necesarios (productos y marcas) y los pasa al cliente.
 * Utiliza Suspense para mostrar un esqueleto de carga mientras se obtienen los datos.
 */

import ComparePageClient from '@/components/compare/ComparePageClient';
import { getProductsFromDb } from '@/lib/data/products';
import { getBrandsFromDb } from '@/lib/data/brands';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

/**
 * Componente esqueleto para mostrar mientras se cargan los datos de la página de comparación.
 * Proporciona una retroalimentación visual inmediata al usuario.
 */
const ProductCompareSkeleton = () => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <h1 className="font-headline text-3xl md:text-4xl font-bold mb-8">Comparar Productos</h1>
    <div className="overflow-x-auto">
      <div className="flex space-x-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="min-w-64 space-y-4">
            <div className="bg-muted animate-pulse h-48 rounded-lg"></div>
            <div className="bg-muted animate-pulse h-8 rounded"></div>
            <div className="bg-muted animate-pulse h-6 w-1/2 rounded"></div>
            <div className="space-y-2">
              <div className="bg-muted animate-pulse h-4 rounded"></div>
              <div className="bg-muted animate-pulse h-4 w-5/6 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Componente de página para comparar productos.
 * Realiza la obtención de datos en el servidor y delega la renderización al componente cliente.
 * 
 * @returns {Promise<JSX.Element>} La página de comparación de productos.
 */
export default async function ComparePage() {
    // Obtiene los datos de productos y marcas del servidor.
    const products = await getProductsFromDb();
    const brands = await getBrandsFromDb();
    
    return (
        // Suspense muestra el esqueleto mientras los datos se resuelven.
        <Suspense fallback={<ProductCompareSkeleton />}>
            <ComparePageClient 
                allProducts={products.filter(p => p.status === 'Activo')} 
                allBrands={brands.filter(b => b.status === 'Activo')}
            />
        </Suspense>
    )
}
