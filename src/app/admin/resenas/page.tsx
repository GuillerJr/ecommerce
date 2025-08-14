/**
 * @fileoverview Página del lado del servidor para la gestión de reseñas de productos.
 * Obtiene todas las reseñas de todos los productos y las pasa al componente cliente.
 */

import { getAllReviews } from "@/lib/data/reviews";
import ReviewsPageClient from "@/components/admin/ReviewsPageClient";

export const dynamic = 'force-dynamic';

/**
 * Componente de página para la administración de reseñas.
 * 
 * @returns {Promise<JSX.Element>} El componente de la página de reseñas.
 */
export default async function AdminReviewsPage() {
  // Obtiene todas las reseñas de la base de datos.
  const reviews = await getAllReviews();

  // Renderiza el componente cliente con las reseñas para su moderación.
  return <ReviewsPageClient initialReviews={reviews} />;
}
