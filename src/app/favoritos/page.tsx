
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/contexts/FavoritesContext";
import { getProductsAction } from "@/lib/actions/products";
import type { Product, Discount, Brand } from "@/types";
import { getDiscountsAction, getBrandsAction } from "@/lib/actions";
import ProductGrid from "@/components/products/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";


const ProductGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/4" />
      </div>
    ))}
  </div>
);


export default function FavoritosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { favoriteIds, isFavoritesLoading } = useFavorites();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allDiscounts, setAllDiscounts] = useState<Discount[]>([]);
    const [allBrands, setAllBrands] = useState<Brand[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login?from=/favoritos');
        } else if (user) {
            setIsDataLoading(true);
            Promise.all([
                getProductsAction(),
                getDiscountsAction(),
                getBrandsAction()
            ]).then(([productsResult, discountsResult, brandsResult]) => {
                if (productsResult.success) setAllProducts(productsResult.products || []);
                if (discountsResult.success) setAllDiscounts(discountsResult.discounts || []);
                if (brandsResult.success) setAllBrands(brandsResult.brands || []);
            }).finally(() => setIsDataLoading(false));
        } else if (!loading) {
             setIsDataLoading(false);
        }
    }, [user, loading, router]);


    const favoriteProducts = useMemo(() => {
        if (!allProducts.length || isFavoritesLoading) return [];
        return allProducts.filter(product => favoriteIds.includes(product.id));
    }, [favoriteIds, allProducts, isFavoritesLoading]);

    const activeDiscounts = useMemo(() => allDiscounts.filter(d => d.status === 'Activo'), [allDiscounts]);

    if (loading || isDataLoading || isFavoritesLoading) {
        return (
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="font-headline text-3xl md:text-4xl font-bold">Mis Favoritos</h1>
                        <p className="text-lg text-muted-foreground">Tus productos guardados en un solo lugar.</p>
                    </div>
                    <ProductGridSkeleton />
                </div>
            </div>
        )
    }

    if (!user) {
        return (
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
                <Heart className="mx-auto h-16 w-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold mt-4">Consulta tus favoritos</h1>
                <p className="text-muted-foreground mt-2">Inicia sesión para ver los productos que has guardado.</p>
                <Button asChild className="mt-6">
                <Link href="/login?from=/favoritos">
                    <LogIn className="mr-2" />
                    Iniciar Sesión
                </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="font-headline text-3xl md:text-4xl font-bold">Mis Favoritos</h1>
                    <p className="text-lg text-muted-foreground">Tus productos guardados en un solo lugar.</p>
                </div>
                
                {favoriteProducts.length > 0 ? (
                    <ProductGrid
                        products={favoriteProducts}
                        activeDiscounts={activeDiscounts}
                        allBrands={allBrands}
                        showAddToCartButton={false}
                    />
                ) : (
                    <Card>
                        <CardContent>
                            <div className="text-center py-24">
                                <Heart className="mx-auto h-16 w-16 text-muted-foreground" />
                                <h3 className="mt-4 text-2xl font-semibold text-foreground">Aún no hay favoritos</h3>
                                <p className="mt-2 text-md text-muted-foreground">Explora la tienda y añade productos a tus favoritos para verlos aquí.</p>
                                <Button asChild className="mt-6">
                                    <Link href="/tienda">Ir a la tienda</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="mt-12 flex justify-center">
                    <Button asChild variant="outline">
                        <Link href="/perfil">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Perfil
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
