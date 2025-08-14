/**
 * @fileoverview Página del lado del servidor para mostrar productos en oferta y combos.
 * Obtiene todos los productos y descuentos, separa los combos de los descuentos individuales,
 * y los pasa a los componentes correspondientes para su visualización.
 */

import { getProductsFromDb } from '@/lib/data/products';
import { getDiscounts } from '@/lib/data/discounts';
import { getBrandsFromDb } from '@/lib/data/brands';
import ProductGrid from '@/components/products/ProductGrid';
import { Suspense } from 'react';
import type { Product, Discount } from '@/types';
import ComboOfferCard from '@/components/products/ComboOfferCard';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';


const ProductGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/4" />
      </div>
    ))}
  </div>
);


/**
 * Componente de página para las ofertas.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de ofertas.
 */
export default async function OfertasPage() {
  // Obtiene todos los datos necesarios desde el servidor.
  const allProducts = (await getProductsFromDb()).filter(p => p.status === 'Activo');
  const allBrands = (await getBrandsFromDb()).filter(b => b.status === 'Activo');
  const activeDiscounts = (await getDiscounts()).filter((d) => d.status === 'Activo');

  // Separa los descuentos de combo de los descuentos de producto único.
  const comboDiscounts = activeDiscounts.filter(d => d.type === 'Combo');
  const singleProductDiscounts = activeDiscounts.filter(d => d.type !== 'Combo');

  // Crea un conjunto de IDs de productos que tienen un descuento individual aplicable.
  const discountedProductIds = new Set<string>();
    singleProductDiscounts.forEach(d => {
        if (d.applicableProductIds) {
            d.applicableProductIds.forEach(id => discountedProductIds.add(id));
        }
    });
  
  // Filtra la lista de productos para mostrar solo los que están en oferta individual.
  const offerProducts = allProducts.filter(p => discountedProductIds.has(p.id));

  return (
    // Utiliza Suspense para mostrar un estado de carga mientras se obtienen los datos.
    <Suspense fallback={<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"><h1 className="font-headline text-4xl font-bold tracking-tight">Cargando Ofertas...</h1></div>}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12">
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Ofertas Especiales</h1>
            <p className="mt-2 text-lg text-muted-foreground">Aprovecha nuestros descuentos y promociones por tiempo limitado.</p>
        </section>

        {comboDiscounts.length > 0 && (
          <section className="mb-12">
            <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight mb-6">Combos Imperdibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {comboDiscounts.map(combo => {
                 const comboProducts = combo.applicableProductIds
                  .map(id => allProducts.find(p => p.id === id))
                  .filter((p): p is Product => p !== undefined);

                return <ComboOfferCard key={combo.id} combo={combo} products={comboProducts} />;
              })}
            </div>
          </section>
        )}

        {offerProducts.length > 0 && (
           <section>
              <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight mb-6">Productos con Descuento</h2>
              <Suspense fallback={<ProductGridSkeleton />}>
                <ProductGrid 
                  products={offerProducts} 
                  activeDiscounts={singleProductDiscounts} 
                  allBrands={allBrands} 
                />
              </Suspense>
           </section>
        )}
      </div>
    </Suspense>
  );
}
