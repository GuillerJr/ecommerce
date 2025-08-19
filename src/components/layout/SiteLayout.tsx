
/**
 * @fileoverview Layout del sitio principal.
 * Este componente decide qué estructura de layout renderizar basándose en la ruta actual.
 * Para las páginas de administración, solo renderiza los hijos directos.
 * Para las páginas públicas, renderiza el encabezado, el pie de página y los breadcrumbs.
 */

'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import type { ReactNode } from 'react';
import type { StoreConfig } from '@/types';
import Breadcrumbs from './Breadcrumbs';
import { usePathname } from 'next/navigation';
import { Toaster } from '../ui/toaster';

/**
 * Componente que gestiona el layout del sitio.
 * @param {object} props - Propiedades del componente.
 * @param {ReactNode} props.children - El contenido de la página actual.
 * @param {StoreConfig} props.storeConfig - La configuración de la tienda.
 * @returns {JSX.Element} El layout apropiado para la ruta actual.
 */
export default function SiteLayout({ children, storeConfig }: { children: ReactNode, storeConfig: StoreConfig }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

    if (isAdminPage) {
      return <>{children}</>;
    }

    return (
      <div className="relative flex min-h-screen flex-col">
        <Header storeConfig={storeConfig} />
        <main className="flex-1">
          <Breadcrumbs />
          {children}
        </main>
        <Footer storeConfig={storeConfig} />
        <Toaster />
      </div>
    );
  }
  