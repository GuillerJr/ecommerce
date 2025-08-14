
import type { Product, Discount, Brand } from '@/types';
import ProductListItem from './ProductListItem';

interface ProductListProps {
  products: Product[];
  activeDiscounts: Discount[];
  allBrands: Brand[];
}

export default function ProductList({ products, activeDiscounts, allBrands }: ProductListProps) {
  const brandMap = new Map(allBrands.map(b => [b.id, b.name]));
  return (
    <div className="space-y-4">
      {products.map(product => {
        const brandName = product.brandId ? brandMap.get(product.brandId) : undefined;
        return <ProductListItem key={product.id} product={product} activeDiscounts={activeDiscounts} brandName={brandName} />
      })}
    </div>
  );
}
