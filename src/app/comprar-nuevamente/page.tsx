/**
 * @fileoverview Página para la funcionalidad "Comprar Nuevamente".
 * Permite a los usuarios ver los productos que han comprado anteriormente
 * y añadirlos fácilmente al carrito de nuevo.
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrdersAction } from '@/lib/actions/orders';
import { getProductsAction } from '@/lib/actions/products';
import { getDiscountsAction } from '@/lib/actions/discounts';
import { getBrandsAction } from '@/lib/actions/brands';
import type { Order, Product, Discount, Brand } from '@/types';
import ProductGrid from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { Repeat, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Componente esqueleto para la cuadrícula de productos.
 * Muestra una animación de carga mientras se obtienen los datos.
 */
const ProductGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/4" />
      </div>
    ))}
  </div>
);

/**
 * Componente principal de la página "Comprar Nuevamente".
 * @returns {JSX.Element | null} La página renderizada o null si se redirige.
 */
export default function ComprarNuevamentePage() {
    // Hooks de estado y contexto.
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [orders, setOrders] = useState<Order[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Redirige al login si el usuario no está autenticado.
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login?from=/comprar-nuevamente');
        }
    }, [user, authLoading, router]);
    
    // Obtiene los datos necesarios cuando el usuario está disponible.
    useEffect(() => {
        if (user) {
            setIsLoading(true);
            Promise.all([
                getOrdersAction(),
                getProductsAction(),
                getDiscountsAction(),
                getBrandsAction()
            ]).then(([ordersResult, productsResult, discountsResult, brandsResult]) => {
                if (ordersResult.success && ordersResult.orders) {
                    setOrders(ordersResult.orders.filter(o => o.email === user.email));
                }
                if (productsResult.success) setAllProducts(productsResult.products || []);
                if (discountsResult.success) setDiscounts(discountsResult.discounts || []);
                if (brandsResult.success) setBrands(brandsResult.brands || []);
            }).finally(() => {
                setIsLoading(false);
            });
        } else if (!authLoading) {
            setIsLoading(false);
        }
    }, [user, authLoading]);

    // Memoriza la lista de productos que el usuario ha comprado antes.
    const buyAgainProducts = useMemo(() => {
        if (!orders.length || !allProducts.length) return [];

        const productIdsFromOrders = new Set<string>();
        orders.forEach(order => {
            order.items.forEach(item => {
                productIdsFromOrders.add(item.productId);
            });
        });
        
        return allProducts.filter(p => productIdsFromOrders.has(p.id) && p.status === 'Activo');
    }, [orders, allProducts]);
    
    // Memoriza los descuentos activos para pasarlos a la cuadrícula de productos.
    const activeDiscounts = useMemo(() => discounts.filter(d => d.status === 'Activo'), [discounts]);
    
    // Estado de carga combinado (autenticación y datos).
    const isLoadingData = authLoading || isLoading;

    // Renderiza el esqueleto de carga.
    if (isLoadingData) {
         return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                 <div className="mb-8">
                    <h1 className="font-headline text-3xl md:text-4xl font-bold">Comprar Nuevamente</h1>
                    <p className="text-lg text-muted-foreground">Revisa productos que has comprado antes.</p>
                </div>
                <ProductGridSkeleton />
            </div>
         );
    }
    
    // Si no hay usuario, no renderiza nada (la redirección se maneja en el efecto).
    if (!user) {
        return null;
    }

    // Renderiza la página principal.
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="mb-8">
                <h1 className="font-headline text-3xl md:text-4xl font-bold">Comprar Nuevamente</h1>
                <p className="text-lg text-muted-foreground">Productos que has comprado anteriormente. ¡Añádelos al carrito fácilmente!</p>
            </div>

            {buyAgainProducts.length > 0 ? (
                // Muestra la cuadrícula de productos si el usuario ha comprado algo.
                <ProductGrid products={buyAgainProducts} activeDiscounts={activeDiscounts} allBrands={brands} />
            ) : (
                // Muestra un mensaje si el usuario aún no tiene historial de compras.
                <Card>
                    <CardContent className="text-center py-24">
                        <Repeat className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-2xl font-semibold text-foreground">Aún no has comprado nada</h3>
                        <p className="mt-2 text-md text-muted-foreground">Cuando compres productos, aparecerán aquí para que puedas volver a pedirlos.</p>
                        <Button asChild className="mt-6">
                            <Link href="/tienda">Ir a la tienda</Link>
                        </Button>
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
    );
}
