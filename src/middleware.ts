/**
 * @fileoverview Middleware de Next.js.
 * Este archivo permite ejecutar código en el servidor antes de que una solicitud
 * sea completada. Actualmente, está configurado para no realizar ninguna acción
 * y simplemente pasar a la siguiente etapa.
 * Podría usarse en el futuro para tareas como redirecciones, reescritura de URLs,
 * o autenticación en el borde.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * La función principal del middleware.
 * @param {NextRequest} request - La solicitud entrante.
 * @returns {NextResponse} La respuesta a enviar al cliente.
 */
export function middleware(request: NextRequest) {
  // Simplemente continúa con la solicitud sin modificarla.
  return NextResponse.next();
}

/**
 * Configuración del middleware.
 * El `matcher` define en qué rutas se ejecutará este middleware.
 * Un array vacío significa que no se ejecutará en ninguna ruta.
 */
export const config = {
  matcher: [],
};
