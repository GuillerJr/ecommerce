
/**
 * @fileoverview Página para mostrar el historial de productos vistos recientemente por el usuario.
 * Permite al usuario ver y borrar su historial, y cambiar entre vista de cuadrícula y lista.
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProductsAction } from '@/lib/actions/products';
import { getDiscountsAction } from '@/lib/actions/discounts';
import { updateUserAction } from '@/lib/actions/users';
import { getBrandsAction } from '@/lib/actions/brands';
import type { Product, Discount, Brand } from '@/types';
import ProductGrid from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { History, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
 * Componente principal de la página "Vistos Recientemente".
 * @returns {JSX.Element | null} La página renderizada o null si se redirige.
 */
export default function HistorialBusquedaPage() {
    // Hooks de estado y contexto.
    const { user, loading: authLoading, updateUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Redirige al login si el usuario no está autenticado.
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login?from=/historial-busqueda');
        }
    }, [user, authLoading, router]);
    
    // Obtiene los datos necesarios cuando el usuario está disponible.
    useEffect(() => {
        if (user) {
            setIsLoading(true);
            Promise.all([
                getProductsAction(),
                getDiscountsAction(),
                getBrandsAction()
            ]).then(([productsResult, discountsResult, brandsResult]) => {
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

    // Memoriza la lista de productos vistos recientemente.
    const recentlyViewedProducts = useMemo(() => {
        if (!user || !user.recentlyViewed || !allProducts.length) return [];
        
        const productMap = new Map(allProducts.map(p => [p.id, p]));
        
        return user.recentlyViewed
            .map(id => productMap.get(id))
            .filter((p): p is Product => p !== undefined && p.status === 'Activo');

    }, [user, allProducts]);
    
    // Memoriza los descuentos activos.
    const activeDiscounts = useMemo(() => discounts.filter(d => d.status === 'Activo'), [discounts]);
    
    // Función para limpiar el historial de productos vistos.
    const handleClearHistory = async () => {
        if (!user) return;
        const result = await updateUserAction({ ...user, recentlyViewed: [] });
        if (result.success && result.user) {
            updateUser(result.user);
            toast({ title: "Historial de visualización borrado" });
        } else {
            toast({ title: "Error", description: "No se pudo borrar el historial.", variant: "destructive" });
        }
    };
    
    const isLoadingData = authLoading || isLoading;

    // Renderiza el esqueleto de carga.
    if (isLoadingData) {
         return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                 <div className="mb-8">
                    <h1 className="font-headline text-3xl md:text-4xl font-bold">Vistos Recientemente</h1>
                    <p className="text-lg text-muted-foreground">Revisa los productos que has visto últimamente.</p>
                </div>
                <ProductGridSkeleton />
            </div>
         );
    }
    
    // Si no hay usuario, no renderiza nada.
    if (!user) {
        return null;
    }

    // Renderiza la página principal.
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
             <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="font-headline text-3xl md:text-4xl font-bold">Vistos Recientemente</h1>
                    <p className="text-lg text-muted-foreground">Productos que has explorado recientemente.</p>
                </div>
                 {recentlyViewedProducts.length > 0 && (
                    <Button variant="outline" onClick={handleClearHistory}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Borrar Historial
                    </Button>
                )}
            </div>

            {recentlyViewedProducts.length > 0 ? (
                <ProductGrid products={recentlyViewedProducts} activeDiscounts={activeDiscounts} allBrands={brands} showAddToCartButton={false} />
            ) : (
                // Muestra un mensaje si no hay historial.
                <Card>
                    <CardContent className="text-center py-24">
                        <History className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-2xl font-semibold text-foreground">Aún no has visto ningún producto</h3>
                        <p className="mt-2 text-md text-muted-foreground">Cuando explores productos, aparecerán aquí.</p>
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
