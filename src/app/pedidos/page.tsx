/**
 * @fileoverview Página del lado del servidor para el historial de pedidos.
 * Se encarga de obtener los datos iniciales (pedidos y productos) y los pasa al
 * componente cliente para su renderización y manejo de la interactividad.
 */

import { getOrdersAction } from '@/lib/actions/orders';
import { getProductsAction } from '@/lib/actions/products';
import PedidosPageClient from '@/components/pedidos/PedidosPageClient';

export const dynamic = 'force-dynamic';

export default async function PedidosPage() {
    const ordersResult = await getOrdersAction();
    const productsResult = await getProductsAction();

    const initialOrders = ordersResult.success ? ordersResult.orders || [] : [];
    const initialProducts = productsResult.success ? productsResult.products || [] : [];

    return <PedidosPageClient initialOrders={initialOrders} initialProducts={initialProducts} />;
}
