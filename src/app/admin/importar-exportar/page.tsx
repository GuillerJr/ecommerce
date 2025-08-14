/**
 * @fileoverview Página del lado del servidor para la funcionalidad de Importar/Exportar datos.
 * Esta página simplemente renderiza el componente cliente correspondiente.
 */

import ImportExportPageClient from "@/components/admin/ImportExportPageClient";

/**
 * Componente de página para la sección de Importar/Exportar del panel de administración.
 * 
 * @returns {JSX.Element} El componente de cliente que maneja la lógica de importación y exportación.
 */
export default function AdminImportExportPage() {
    return <ImportExportPageClient />;
}
