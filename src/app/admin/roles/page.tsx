/**
 * @fileoverview Página del lado del servidor para la gestión de roles.
 * Obtiene la lista de roles y la pasa al componente cliente.
 */

import { getRolesFromDb as getRoles } from "@/lib/data/roles";
import RolesPageClient from "@/components/admin/RolesPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de roles.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de roles.
 */
export default async function AdminRolesPage() {
  const roles = await getRoles();
  return <RolesPageClient initialRoles={roles} />;
}
