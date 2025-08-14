/**
 * @fileoverview Página del lado del servidor para la gestión de sorteos.
 * Obtiene todos los sorteos, productos (para premios) y usuarios (para ganadores)
 * y los pasa al componente cliente.
 */

import { getGiveawaysFromDb as getGiveaways } from "@/lib/data/giveaways";
import { getProductsFromDb as getProducts } from "@/lib/data/products";
import { getUsers } from "@/lib/data/users";
import GiveawaysPageClient from "@/components/admin/GiveawaysPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de sorteos.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de sorteos.
 */
export default async function AdminGiveawaysPage() {
  // Obtiene todos los datos necesarios para la gestión de sorteos.
  const giveaways = await getGiveaways();
  const products = await getProducts();
  const users = await getUsers();

  // Renderiza el componente cliente con los datos para la interfaz de sorteos.
  return <GiveawaysPageClient initialGiveaways={giveaways} allProducts={products} allUsers={users} />;
}
