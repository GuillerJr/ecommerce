/**
 * @fileoverview Página del lado del servidor para la gestión de usuarios.
 * Obtiene la lista de usuarios y la pasa al componente cliente para su visualización y gestión.
 */

import { getUsers } from "@/lib/data/users";
import UsersPageClient from "@/components/admin/UsersPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de usuarios.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de usuarios.
 */
export default async function AdminUsersPage() {
  // Obtiene todos los usuarios de la base de datos.
  const users = await getUsers();

  // Renderiza el componente cliente con la lista de usuarios.
  return <UsersPageClient initialUsers={users} />;
}
