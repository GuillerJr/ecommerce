/** 
 * @fileoverview Página de detalles de un producto específico.
 * Es un componente del lado del servidor que obtiene los datos del producto por su ID,
 * así como datos relacionados (categoría, descuentos, etc.) para pasarlos al componente cliente.
 */

import { getProductById, getProductsFromDb as getProducts } from '@/lib/data/products';
import { getCategoryBySubcategoryId } from '@/lib/data/categories';
import { getDiscounts } from '@/lib/data/discounts';
import { getStoreConfigFromDb as getStoreConfig } from '@/lib/data/store';
import { getBrandsFromDb as getBrands } from '@/lib/data/brands';
import { notFound } from 'next/navigation';
import ProductDetailsClient from '@/components/products/ProductDetailsClient';
import RecommendedProducts from '@/components/products/RecommendedProducts';
import type { Product } from '@/types';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product || product.status !== 'Activo') {
    return { title: 'Producto no encontrado' };
  }

  return {
    title: product.name,
    description: product.description,
  };
}

/**
 * Componente esqueleto para la página de detalles del producto.
 */
function ProductDetailsSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
        <div>
          <Skeleton className="aspect-[4/5] rounded-lg" />
          <div className="grid grid-cols-5 gap-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de contenido que obtiene y renderiza los detalles del producto.
 */
async function ProductPageContent({ id }: { id: string }) {
  const product = await getProductById(id);

  if (!product || product.status !== 'Activo') {
    notFound();
  }

  const category = await getCategoryBySubcategoryId(product.subcategoryId);
  const discounts = (await getDiscounts()).filter(d => d.status === 'Activo');
  const allProducts = (await getProducts()).filter(p => p.status === 'Activo');
  const allBrands = (await getBrands()).filter(b => b.status === 'Activo');
  const storeConfig = await getStoreConfig();

  const recommendations: Product[] = allProducts
    .filter(p => p.subcategoryId === product.subcategoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <ProductDetailsClient
        product={product}
        category={category || undefined}
        allDiscounts={discounts}
        storeConfig={storeConfig}
        allBrands={allBrands}
      />
      <RecommendedProducts
        recommendations={recommendations}
        allDiscounts={discounts}
        allBrands={allBrands}
      />
    </div>
  );
}

/**
 * Componente principal de la página de producto, que utiliza Suspense para la carga de datos.
 */
export default async function ProductPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return (
    <Suspense fallback={<ProductDetailsSkeleton />}>
      <ProductPageContent id={id} />
    </Suspense>
  );
}
