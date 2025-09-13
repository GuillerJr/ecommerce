
import Image from 'next/image';
import type { Product, Discount } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { calculateDiscountedPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProductListItemProps {
  product: Product;
  activeDiscounts: Discount[];
  brandName?: string;
  showAddToCartButton?: boolean;
}

export default function ProductListItem({ product, activeDiscounts, brandName, showAddToCartButton = true }: ProductListItemProps) {
  const { addToCart } = useCart();
  const discountInfo = calculateDiscountedPrice(product, activeDiscounts);

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-6">
        <Link href={`/product/${product.id}`} className="flex-shrink-0 w-full sm:w-auto">
          <Image
            src={product.image}
            alt={product.name}
            width={120}
            height={120}
            className="rounded-md object-contain aspect-square border w-full sm:w-[120px] p-1 bg-secondary/50"
          />
        </Link>
        <div className="flex-1 grid gap-1 w-full">
          {brandName && (
            <p className="text-xs text-muted-foreground">{brandName}</p>
          )}
          <Link href={`/product/${product.id}`} className="font-semibold text-lg hover:underline">
            {product.name}
          </Link>
          <p className="text-muted-foreground text-sm line-clamp-2">{product.description}</p>
          <div className="mt-2">
            {discountInfo ? (
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold text-destructive">${discountInfo.finalPrice.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground line-through">${discountInfo.originalPrice.toFixed(2)}</p>
                <Badge variant="destructive">OFERTA</Badge>
              </div>
            ) : (
              <p className="text-xl font-bold text-foreground">${product.price.toFixed(2)}</p>
            )}
          </div>
        </div>
        {showAddToCartButton ? (
            <Button
              onClick={() => addToCart(product, 1, {})}
              className="w-full sm:w-auto self-center"
              disabled={product.saleType === 'stock' && product.stock === 0}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {product.saleType === 'stock' && product.stock === 0 ? 'Agotado' : 'Añadir al carrito'}
            </Button>
        ) : (
            <Button asChild className="w-full sm:w-auto self-center" variant="outline">
                <Link href={`/product/${product.id}`}>Ver producto</Link>
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
