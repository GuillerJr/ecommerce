/**
 * @fileoverview Página del lado del servidor para añadir stock al inventario.
 * Se encarga de obtener solo los productos que se venden por stock y los pasa al cliente.
 */

import { getProductsFromDb } from "@/lib/data/products";
import AddStockPageClient from "@/components/admin/AddStockPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la sección de añadir stock.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página para añadir stock.
 */
export default async function AdminAddStockPage() {
  // Obtiene solo los productos cuyo tipo de venta es 'stock' directamente desde la BD.
  const products = await getProductsFromDb('stock');
  
  // Renderiza el componente cliente con la lista de productos filtrada.
  return <AddStockPageClient allProducts={products} />;
}
