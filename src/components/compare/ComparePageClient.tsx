
'use client';

import { useComparison } from "@/contexts/ComparisonContext";
import { useMemo } from "react";
import type { Product, Brand } from "@/types";
import { Button } from "../ui/button";
import Link from "next/link";
import { GitCompareArrows, ShoppingCart, Star, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "../ui/badge";

interface ComparePageClientProps {
    allProducts: Product[];
    allBrands: Brand[];
}

const StarRating = ({ rating, count }: { rating: number, count: number }) => (
    <div className="flex items-center gap-2">
        <div className="flex">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`} />
            ))}
        </div>
        <span className="text-xs text-muted-foreground">({count})</span>
    </div>
);


export default function ComparePageClient({ allProducts, allBrands }: ComparePageClientProps) {
    const { comparisonIds, removeFromComparison, clearComparison } = useComparison();
    const { addToCart } = useCart();
    
    const brandMap = useMemo(() => new Map(allBrands.map(b => [b.id, b.name])), [allBrands]);

    const productsToCompare = useMemo(() => {
        if (!allProducts || comparisonIds.length === 0) return [];
        return allProducts.filter(p => comparisonIds.includes(p.id));
    }, [allProducts, comparisonIds]);
    
    const allSpecKeys = useMemo(() => {
        const keys = new Set<string>();
        productsToCompare.forEach(p => {
            if (p.specifications) {
                Object.keys(p.specifications).forEach(key => keys.add(key));
            }
        });
        return Array.from(keys);
    }, [productsToCompare]);

    if (productsToCompare.length === 0) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
                <GitCompareArrows className="mx-auto h-16 w-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold mt-4">Tu lista de comparación está vacía</h1>
                <p className="text-muted-foreground mt-2">Añade algunos productos para verlos aquí y compararlos.</p>
                <Button asChild className="mt-6">
                    <Link href="/tienda">Ir a la tienda</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-headline text-3xl md:text-4xl font-bold">Comparar Productos</h1>
                <Button variant="outline" onClick={clearComparison}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpiar Todo
                </Button>
            </div>

            <div className="overflow-x-auto relative">
                <div className="flex gap-4 pb-4">
                    {productsToCompare.map(product => (
                        <div key={product.id} className="min-w-64 max-w-64 flex-shrink-0">
                           <div className="border rounded-lg overflow-hidden">
                                <div className="relative">
                                    <Link href={`/product/${product.id}`} className="aspect-square block">
                                        <Image src={product.image} alt={product.name} fill sizes="33vw" className="object-cover" />
                                    </Link>
                                    <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={() => removeFromComparison(product.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="font-semibold text-sm line-clamp-2 h-10">{product.name}</h3>
                                    <p className="font-bold text-lg">${product.price.toFixed(2)}</p>
                                    <Button className="w-full" size="sm" onClick={() => addToCart(product, 1, {})}>
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                        Añadir
                                    </Button>
                                </div>
                           </div>
                        </div>
                    ))}
                </div>

                <table className="w-full border-collapse">
                    <tbody>
                        <tr className="bg-muted font-semibold"><td className="p-3 border-b" colSpan={productsToCompare.length + 1}>Información General</td></tr>
                        <tr>
                            <td className="p-3 border-b font-medium w-48">Marca</td>
                            {productsToCompare.map(p => <td key={p.id} className="p-3 border-b">{p.brandId ? brandMap.get(p.brandId) : '-'}</td>)}
                        </tr>
                        <tr>
                            <td className="p-3 border-b font-medium w-48">Valoración</td>
                            {productsToCompare.map(p => (
                                <td key={p.id} className="p-3 border-b">
                                    {p.reviews.length > 0 ? (
                                        <StarRating 
                                            rating={p.reviews.reduce((a, b) => a + b.rating, 0) / p.reviews.length} 
                                            count={p.reviews.length}
                                        />
                                    ) : 'Sin valoraciones'}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="p-3 border-b font-medium w-48">Disponibilidad</td>
                            {productsToCompare.map(p => (
                                <td key={p.id} className="p-3 border-b">
                                    {p.saleType === 'stock' ?
                                        (p.stock > 0 ? <Badge>En Stock</Badge> : <Badge variant="destructive">Agotado</Badge>) :
                                        <Badge variant="secondary">Bajo Pedido</Badge>
                                    }
                                </td>
                            ))}
                        </tr>
                         <tr>
                            <td className="p-3 border-b font-medium align-top w-48">Descripción</td>
                            {productsToCompare.map(p => <td key={p.id} className="p-3 border-b text-sm text-muted-foreground align-top">{p.description}</td>)}
                        </tr>

                        <tr className="bg-muted font-semibold"><td className="p-3 border-b" colSpan={productsToCompare.length + 1}>Especificaciones</td></tr>
                        {allSpecKeys.map(key => (
                           <tr key={key}>
                                <td className="p-3 border-b font-medium w-48">{key}</td>
                                {productsToCompare.map(p => (
                                    <td key={p.id} className="p-3 border-b">{p.specifications?.[key] || '-'}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
