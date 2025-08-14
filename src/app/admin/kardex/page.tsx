/**
 * @fileoverview Página del lado del servidor para la visualización del Kardex de inventario.
 * Obtiene todos los movimientos de inventario y la lista de productos para los filtros.
 */

import { getKardex } from "@/lib/data/kardex";
import { getProductsFromDb as getProducts } from "@/lib/data/products";
import KardexPageClient from "@/components/admin/KardexPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para el Kardex de inventario.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de Kardex.
 */
export default async function KardexPage() {
  // Obtiene todos los registros del kardex y todos los productos.
  const kardexEntries = await getKardex();
  const products = await getProducts();

  // Renderiza el componente cliente pasándole los datos para su visualización y filtrado.
  return <KardexPageClient initialKardexEntries={kardexEntries} allProducts={products} />;
}
