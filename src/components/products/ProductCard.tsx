
'use client';

import Image from 'next/image';
import type { Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Heart, GitCompareArrows } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useComparison } from '@/contexts/ComparisonContext';

interface ProductCardProps {
  product: Product;
  discountInfo: { finalPrice: number; originalPrice: number; } | null;
  brandName?: string;
}

export default function ProductCard({ product, discountInfo, brandName }: ProductCardProps) {
  const { isFavorite, toggleFavorite, isFavoritesLoading } = useFavorites();
  const { isComparing, toggleComparison, isComparisonLoading } = useComparison();


  const averageRating = product.reviews.length > 0
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
    : 0;

  const isActuallyFavorite = !isFavoritesLoading && isFavorite(product.id);
  const isActuallyComparing = !isComparisonLoading && isComparing(product.id);


  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:shadow-xl">
      <div className="relative overflow-hidden">
        <Link href={`/product/${product.id}`} className="absolute inset-0 z-0" aria-label={`Ver ${product.name}`} />
        <div className="aspect-square bg-secondary/50">
          <Image
            src={product.image || 'https://placehold.co/600x400.png'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain transition-transform duration-300 group-hover:scale-105 p-2"
          />
        </div>
        
        <div className='absolute top-3 right-3 z-10 flex flex-col gap-2'>
            <Button
                size="icon"
                className="h-9 w-9 rounded-full bg-background/60 text-foreground/80 backdrop-blur-sm transition-all hover:scale-110 hover:bg-background/80"
                onClick={(e) => { e.preventDefault(); toggleFavorite(product.id, product.name); }}
                aria-label={isActuallyFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                disabled={isFavoritesLoading}
            >
                <Heart className={cn("h-5 w-5", isActuallyFavorite ? "fill-red-500 text-red-500" : "")} />
            </Button>
            <Button
                size="icon"
                className="h-9 w-9 rounded-full bg-background/60 text-foreground/80 backdrop-blur-sm transition-all hover:scale-110 hover:bg-background/80"
                onClick={(e) => { e.preventDefault(); toggleComparison(product.id, product.name); }}
                aria-label={isActuallyComparing ? 'Quitar de la comparación' : 'Añadir a la comparación'}
                disabled={isComparisonLoading}
            >
                <GitCompareArrows className={cn("h-5 w-5", isActuallyComparing ? "text-primary" : "")} />
            </Button>
        </div>


        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-between p-3">
          <div>
            {discountInfo && (
              <Badge variant="destructive" className="text-sm">OFERTA</Badge>
            )}
          </div>
          <div>
            {product.saleType === 'on_demand' ? (
              <Badge variant="secondary">Bajo Pedido</Badge>
            ) : product.stock > 0 ? (
              <Badge variant="default" className="border-green-600 bg-green-500 text-white shadow-md">En Stock</Badge>
            ) : (
              <Badge variant="destructive">Agotado</Badge>
            )}
          </div>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        {brandName && (
          <p className="text-xs text-muted-foreground mb-1">{brandName}</p>
        )}
        <Link href={`/product/${product.id}`} className="z-10">
          <h3 className="font-semibold leading-tight text-foreground transition-colors hover:text-primary line-clamp-2">{product.name}</h3>
        </Link>
        
        <div className="mt-2 flex items-center gap-2">
            {product.reviews.length > 0 && (
              <>
                <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("h-4 w-4", i < Math.round(averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300')} />
                    ))}
                </div>
                <span className="text-xs text-muted-foreground">({product.reviews.length})</span>
              </>
            )}
        </div>
        
        <div className="flex-1" />

        <div className="mt-4 flex items-end justify-between">
          {discountInfo ? (
            <div>
              <p className="text-xs text-muted-foreground line-through">${discountInfo.originalPrice.toFixed(2)}</p>
              <p className="text-xl font-bold text-destructive">${discountInfo.finalPrice.toFixed(2)}</p>
            </div>
          ) : (
            <p className="text-xl font-bold text-foreground">${product.price.toFixed(2)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
