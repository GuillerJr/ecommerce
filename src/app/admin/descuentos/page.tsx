/**
 * @fileoverview Página del lado del servidor para la gestión de descuentos y promociones.
 * Obtiene la lista de descuentos y productos para pasarlos al componente cliente.
 */

import { getDiscounts } from "@/lib/data/discounts";
import { getProductsFromDb as getProducts } from "@/lib/data/products";
import DiscountsPageClient from "@/components/admin/DiscountsPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de descuentos.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de descuentos.
 */
export default async function AdminDiscountsPage() {
  // Obtiene todos los descuentos y productos existentes.
  const discounts = await getDiscounts();
  const products = await getProducts();

  // Renderiza el componente cliente, que manejará la lógica de la UI,
  // pasándole los datos necesarios.
  return <DiscountsPageClient initialDiscounts={discounts} allProducts={products} />;
}
