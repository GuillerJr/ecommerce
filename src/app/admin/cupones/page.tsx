/**
 * @fileoverview Página del lado del servidor para la gestión de cupones de descuento.
 * Obtiene la lista de cupones desde la base de datos y la pasa al componente cliente.
 */

import { getCoupons } from "@/lib/data/coupons";
import CouponsPageClient from "@/components/admin/CouponsPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de cupones.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de cupones.
 */
export default async function AdminCouponsPage() {
  // Obtiene la lista inicial de cupones.
  const coupons = await getCoupons();

  // Renderiza el componente cliente, pasándole los datos para la interfaz de usuario.
  return <CouponsPageClient initialCoupons={coupons} />;
}
