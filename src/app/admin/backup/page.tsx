/**
 * @fileoverview Página del lado del servidor para la gestión de copias de seguridad (backups).
 * Se encarga de obtener el historial inicial de backups desde la base de datos
 * y lo pasa al componente cliente para su renderización.
 */

import BackupPageClient from "@/components/admin/BackupPageClient";
import { getBackups } from "@/lib/data/backups";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la sección de administración de backups.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de backups renderizado.
 */
export default async function AdminBackupPage() {
  // Obtiene la lista inicial de backups creados previamente.
  const initialBackups = await getBackups();

  // Renderiza el componente del lado del cliente, pasándole los datos iniciales.
  return <BackupPageClient initialBackups={initialBackups} />;
}
