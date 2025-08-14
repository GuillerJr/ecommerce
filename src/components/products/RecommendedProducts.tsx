
'use client';

import type { Product, Discount, Brand } from '@/types';
import ProductGrid from './ProductGrid';

export default function RecommendedProducts({ recommendations, allDiscounts, allBrands }: { recommendations: Product[], allDiscounts: Discount[], allBrands: Brand[] }) {
  const activeDiscounts = allDiscounts.filter(d => d.status === 'Activo');

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 md:mt-24">
      <h2 className="font-headline text-2xl md:text-3xl font-bold mb-6">También te podría gustar</h2>
      <ProductGrid products={recommendations} activeDiscounts={activeDiscounts} allBrands={allBrands} />
    </div>
  );
}
