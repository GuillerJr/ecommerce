/**
 * @fileoverview Página del lado del servidor para configurar el contenido de la página "Nosotros".
 * Obtiene la configuración actual y la lista de iconos disponibles para el formulario.
 */

import { getNosotrosPageConfig } from "@/lib/data/nosotros";
import NosotrosPageClient from "@/components/admin/NosotrosPageClient";
import { iconList } from "@/lib/icons";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la configuración de "Nosotros".
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de configuración.
 */
export default async function AdminNosotrosPage() {
  // Obtiene la configuración actual de la página "Nosotros".
  const config = await getNosotrosPageConfig();

  // Renderiza el componente cliente, pasándole la configuración inicial y la lista de iconos.
  return <NosotrosPageClient initialConfig={config} icons={iconList} />;
}
