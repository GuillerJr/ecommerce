
/**
 * @fileoverview Página del lado del servidor para el Punto de Venta (POS).
 * Recopila los datos necesarios (productos, cupones, descuentos) y los pasa al cliente.
 */

import { getProductsFromDb } from "@/lib/data/products";
import { getCoupons } from "@/lib/data/coupons";
import { getDiscounts } from "@/lib/data/discounts";
import PointOfSaleClient from "@/components/admin/PointOfSaleClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para el Punto de Venta.
 * 
 * @returns {Promise<JSX.Element>} El componente del Punto de Venta.
 */
export default async function PointOfSalePage() {
  // Obtiene los datos necesarios, filtrando solo los elementos activos.
  const products = (await getProductsFromDb()).filter(p => p.status === 'Activo' && p.saleType === 'stock');
  const coupons = (await getCoupons()).filter(c => c.status === 'Activo');
  const discounts = (await getDiscounts()).filter(d => d.status === 'Activo');

  // Renderiza el componente cliente con los datos para la interfaz del POS.
  return (
    <PointOfSaleClient
      allProducts={products}
      allCoupons={coupons}
      allDiscounts={discounts}
    />
  );
}
