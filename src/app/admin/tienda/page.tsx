/**
 * @fileoverview Página del lado del servidor para la configuración general de la tienda.
 * Obtiene la configuración actual y la pasa al componente cliente.
 */

import { getStoreConfigFromDb as getStoreConfig } from "@/lib/data/store";
import StoreConfigPageClient from "@/components/admin/StoreConfigPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la configuración de la tienda.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de configuración.
 */
export default async function AdminStoreConfigPage() {
  // Obtiene la configuración actual de la tienda desde la base de datos.
  const config = await getStoreConfig();

  // Renderiza el componente cliente con la configuración inicial.
  return <StoreConfigPageClient initialConfig={config} />;
}
