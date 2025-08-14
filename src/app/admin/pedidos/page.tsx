/**
 * @fileoverview Página del lado del servidor para la gestión de pedidos.
 * Obtiene todos los pedidos y productos y los pasa al componente cliente.
 */

import { getOrdersFromDb } from "@/lib/data/orders";
import { getProductsFromDb } from "@/lib/data/products";
import OrdersPageClient from "@/components/admin/OrdersPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de pedidos.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de pedidos.
 */
export default async function AdminOrdersPage() {
  // Obtiene todos los pedidos y productos.
  const orders = await getOrdersFromDb();
  const products = await getProductsFromDb();

  // Renderiza el componente cliente, que manejará la visualización y filtrado de pedidos.
  // Se pasan todos los productos para poder mostrar detalles de los artículos en cada pedido.
  return <OrdersPageClient initialOrders={orders} allProducts={products} />;
}
