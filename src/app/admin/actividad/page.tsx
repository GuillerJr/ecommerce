/**
 * @fileoverview Página del lado del servidor para visualizar el historial de actividad.
 * Se encarga de obtener todos los registros de actividad del administrador.
 */

import { getActivityLogs } from "@/lib/data/activity";
import { getUsers } from "@/lib/data/users";
import ActivityLogPageClient from "@/components/admin/ActivityLogPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para el historial de actividad.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de actividad.
 */
export default async function ActivityLogPage() {
  const activityLogs = await getActivityLogs();
  const users = await getUsers();

  return <ActivityLogPageClient initialLogs={activityLogs} allUsers={users} />;
}
