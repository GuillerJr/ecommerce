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

export const dynamic = 'force-dynamic';

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
    <Suspense fallback={<div className="container mx-auto py-16 text-center">Cargando sorteos...</div>}>
      <GiveawaysPageClient initialGiveaways={giveaways} allProducts={products} allUsers={users} />
    </Suspense>
  );
}
