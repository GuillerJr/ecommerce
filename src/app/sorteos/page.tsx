/**
 * @fileoverview Página del lado del servidor para mostrar la lista de sorteos.
 * Se encarga de obtener los datos de sorteos, productos y usuarios, y los pasa
 * al componente cliente para su renderización y manejo de la interactividad.
 */

import { getGiveawaysFromDb as getGiveaways } from "@/lib/data/giveaways";
import { getProductsFromDb as getProducts } from "@/lib/data/products";
import { getUsers } from "@/lib/data/users";
import GiveawaysPageClient from "@/components/giveaways/GiveawaysPageClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = 'force-dynamic';

const GiveawaysSkeleton = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
        </div>
        <section>
             <Skeleton className="h-10 w-1/4 mb-6" />
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-4">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <div className="space-y-2">
                           <Skeleton className="h-20 w-full" />
                           <Skeleton className="h-5 w-1/2" />
                        </div>
                        <Skeleton className="h-10 w-full" />
                    </div>
                 ))}
            </div>
        </section>
    </div>
);


/**
 * Componente de página para la sección de sorteos.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de sorteos renderizado.
 */
export default async function GiveawaysPage() {
  // Obtiene los sorteos activos, todos los productos (para mostrar premios) y todos los usuarios (para mostrar ganadores).
  const giveaways = (await getGiveaways()).filter(g => g.status !== 'Inactivo');
  const products = await getProducts();
  const users = await getUsers();

  // Utiliza Suspense para mostrar un estado de carga mientras se obtienen los datos.
  return (
    <Suspense fallback={<GiveawaysSkeleton />}>
      <GiveawaysPageClient initialGiveaways={giveaways} allProducts={products} allUsers={users} />
    </Suspense>
  );
}
