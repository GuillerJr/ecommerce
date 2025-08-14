/**
 * @fileoverview Página de redirección para la sección de torneos.
 * Redirige a la subpágina de torneos de liga por defecto.
 */

'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function AdminTournamentsRedirectPage() {
  useEffect(() => {
    redirect('/admin/torneos/liga');
  }, []);

  return null;
}
