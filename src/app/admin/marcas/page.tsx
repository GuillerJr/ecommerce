/**
 * @fileoverview Página del lado del servidor para la gestión de marcas de productos.
 * Obtiene la lista de marcas desde la base de datos y la pasa al componente cliente.
 */

import { getBrandsFromDb as getBrands } from "@/lib/data/brands";
import BrandsPageClient from "@/components/admin/BrandsPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de marcas.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de marcas.
 */
export default async function AdminBrandsPage() {
  // Obtiene la lista inicial de marcas.
  const brands = await getBrands();

  // Renderiza el componente cliente con los datos iniciales.
  return <BrandsPageClient initialBrands={brands} />;
}
