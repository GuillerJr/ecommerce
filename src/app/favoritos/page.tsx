
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
import type { Product } from "@/types";
import Image from "next/image";

export default function FavoritosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { favoriteIds, toggleFavorite } = useFavorites();
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    useEffect(() => {
        if (user) {
            getProductsAction().then(result => {
                if (result.success && result.products) {
                    setAllProducts(result.products);
                }
            });
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
        return <div className="flex h-screen items-center justify-center">Cargando...</div>;
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
                            <Card key={product.id}>
                                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-6">
                                    <Link href={`/product/${product.id}`} className="flex-shrink-0 w-full sm:w-auto">
                                        <Image
                                            src={product.image}
                                            alt={product.name}
                                            width={120}
                                            height={120}
                                            className="rounded-md object-cover aspect-square border w-full sm:w-[120px]"
                                        />
                                    </Link>
                                    <div className="flex-1 grid gap-1 w-full">
                                        <Link href={`/product/${product.id}`} className="font-semibold text-lg hover:underline">
                                            {product.name}
                                        </Link>
                                        <p className="text-muted-foreground text-sm line-clamp-2">{product.description}</p>
                                        <p className="font-bold text-xl">${product.price.toFixed(2)}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleFavorite(product.id, product.name)}
                                        className="w-full sm:w-auto self-center"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </Button>
                                </CardContent>
                            </Card>
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
