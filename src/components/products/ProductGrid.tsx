
import type { Product, Discount, Brand } from '@/types';
import ProductCard from './ProductCard';
import { calculateDiscountedPrice } from '@/lib/utils';

interface ProductGridProps {
  products: Product[];
  activeDiscounts: Discount[];
  allBrands: Brand[];
}

export default function ProductGrid({ products, activeDiscounts, allBrands }: ProductGridProps) {
  const brandMap = new Map(allBrands.map(b => [b.id, b.name]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
      {products.map(product => {
        const discountInfo = calculateDiscountedPrice(product, activeDiscounts);
        const brandName = product.brandId ? brandMap.get(product.brandId) : undefined;
        return <ProductCard key={product.id} product={product} discountInfo={discountInfo} brandName={brandName} />
      })}
    </div>
  );
}
