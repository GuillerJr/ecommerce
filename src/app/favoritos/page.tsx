
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/contexts/FavoritesContext";
import { getProductsAction } from "@/lib/actions/products";
import type { Product, Discount, Brand } from "@/types";
import Image from "next/image";
import ProductListItem from "@/components/products/ProductListItem";
import { getDiscountsAction, getBrandsAction } from "@/lib/actions";

export const dynamic = 'force-dynamic';

export default function FavoritosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { favoriteIds, toggleFavorite } = useFavorites();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allDiscounts, setAllDiscounts] = useState<Discount[]>([]);
    const [allBrands, setAllBrands] = useState<Brand[]>([]);


    useEffect(() => {
        if (user) {
            getProductsAction().then(result => {
                if (result.success && result.products) {
                    setAllProducts(result.products);
                }
            });
            getDiscountsAction().then(result => {
                if(result.success && result.discounts) setAllDiscounts(result.discounts);
            })
             getBrandsAction().then(result => {
                if(result.success && result.brands) setAllBrands(result.brands);
            })
        }
    }, [user]);

    const favoriteProducts = useMemo(() => {
        if (!allProducts.length) return [];
        return allProducts.filter(product => favoriteIds.includes(product.id));
    }, [favoriteIds, allProducts]);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login?from=/favoritos');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return <div className="flex h-dvh items-center justify-center">Cargando...</div>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="font-headline text-3xl md:text-4xl font-bold">Mis Favoritos</h1>
                    <p className="text-lg text-muted-foreground">Tus productos guardados en un solo lugar.</p>
                </div>
                
                {favoriteProducts.length > 0 ? (
                    <div className="space-y-4">
                        {favoriteProducts.map((product) => (
                           <ProductListItem
                                key={product.id}
                                product={product}
                                activeDiscounts={allDiscounts.filter(d => d.status === 'Activo')}
                                allBrands={allBrands}
                                showAddToCartButton={false}
                            />
                        ))}
                    </div>
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
