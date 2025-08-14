
'use client';

import { useMemo } from 'react';
import ProductGrid from '@/components/products/ProductGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import InfiniteBrandScroll from '@/components/layout/InfiniteBrandScroll';
import type { Product, Category, Subcategory, Discount, Brand } from '@/types';
import { Icon, IconName } from '@/lib/icons';
import Link from 'next/link';

interface HomePageContentClientProps {
  allProducts: Product[];
  allCategories: Category[];
  allSubcategories: Subcategory[];
  allDiscounts: Discount[];
  allBrands: Brand[];
}

export default function HomePageContentClient({ allProducts, allCategories, allSubcategories, allDiscounts, allBrands }: HomePageContentClientProps) {
  
  const featuredProducts = useMemo(() => {
    return allProducts.slice(0, 8);
  }, [allProducts]);
  
  const activeDiscounts = useMemo(() => {
    return allDiscounts.filter(d => d.status === 'Activo');
  }, [allDiscounts]);

  const categories = useMemo(() => {
      const productCountByCategory = new Map<string, number>();

      const subcategoryToCategoryMap = new Map<string, string>(); // subcatId -> catId
      allSubcategories.forEach(sub => {
          subcategoryToCategoryMap.set(sub.id, sub.categoryId);
      });
      
      allProducts.forEach(product => {
          const categoryId = subcategoryToCategoryMap.get(product.subcategoryId);
          if (categoryId) {
              productCountByCategory.set(categoryId, (productCountByCategory.get(categoryId) || 0) + 1);
          }
      });

      return allCategories.slice(0, 5).map(category => ({
          ...category,
          href: `/tienda?category=${encodeURIComponent(category.name)}`,
          productCount: productCountByCategory.get(category.id) || 0
      }));
  }, [allProducts, allCategories, allSubcategories]);

  const formatProductCount = (count: number) => {
    if (count === 1) return '1 producto';
    return `${count} productos`;
  };

  return (
    <div>
      <section className="text-center py-20 md:py-32 bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight">
              EQUÍPATE PARA GANAR
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
              La mejor ropa deportiva para atletas de élite y aficionados. Rendimiento, estilo y calidad en cada prenda.
            </p>
            <Button asChild size="lg" className="mt-8 shadow-lg hover:shadow-primary/30 transition-shadow">
                <Link href="/tienda">Explora la Colección</Link>
            </Button>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">Compra por Categoría</h2>
                <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Encuentra exactamente lo que necesitas para tu deporte.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {categories.map((category) => (
                    <Link href={category.href} key={category.name} className="block">
                        <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border h-full">
                            <CardContent className="p-6 flex flex-col items-center text-center justify-center h-full">
                                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary mb-4 transition-colors group-hover:bg-primary">
                                    {category.iconName ? (
                                        <Icon name={category.iconName as IconName} className="w-8 h-8 text-primary transition-colors group-hover:text-primary-foreground" />
                                    ) : (
                                        <ShoppingBag className="w-8 h-8 text-primary transition-colors group-hover:text-primary-foreground" />
                                    )}
                                </div>
                                <h3 className="font-semibold text-lg">{category.name}</h3>
                                <p className="text-sm text-muted-foreground">{formatProductCount(category.productCount)}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-sm font-semibold uppercase text-muted-foreground tracking-wider mb-8">
                Las mejores marcas del deporte
            </h2>
            <InfiniteBrandScroll />
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">Novedades</h2>
                <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Echa un vistazo a nuestros últimos lanzamientos y productos más populares.</p>
            </div>
            {featuredProducts.length > 0 ? (
                <ProductGrid products={featuredProducts} activeDiscounts={activeDiscounts} allBrands={allBrands} />
            ) : (
                <div className="text-center">
                    <p className="text-lg text-muted-foreground">No hay productos para mostrar.</p>
                </div>
            )}
        </div>
      </section>
    </div>
  );
}
