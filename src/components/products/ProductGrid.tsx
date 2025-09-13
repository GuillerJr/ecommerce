
import type { Product, Discount, Brand } from '@/types';
import ProductCard from './ProductCard';
import { calculateDiscountedPrice } from '@/lib/utils';
import ProductListItem from './ProductListItem';

interface ProductGridProps {
  products: Product[];
  activeDiscounts: Discount[];
  allBrands: Brand[];
  showAddToCartButton?: boolean;
}

export default function ProductGrid({ products, activeDiscounts, allBrands, showAddToCartButton = true }: ProductGridProps) {
  const brandMap = new Map(allBrands.map(b => [b.id, b.name]));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
      {products.map(product => {
        const discountInfo = calculateDiscountedPrice(product, activeDiscounts);
        const brandName = product.brandId ? brandMap.get(product.brandId) : undefined;
        return <ProductCard key={product.id} product={product} discountInfo={discountInfo} brandName={brandName} />
      })}
    </div>
  );
}
