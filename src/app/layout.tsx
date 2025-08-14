
/**
 * @fileoverview Layout principal (raíz) de la aplicación.
 * Este componente es responsable de definir la estructura HTML base,
 * cargar fuentes y manejar la metadata global del sitio. Delega la
 * configuración de proveedores de contexto a un componente cliente.
 */

import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { getStoreConfigFromDb } from '@/lib/data/store';
import { checkDbConnection } from '@/lib/db.server';
import DbConnectionError from '@/components/layout/DbConnectionError';
import Providers from '@/contexts/Providers';
import SiteLayout from '@/components/layout/SiteLayout';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});

/**
 * Genera la metadata dinámica para la página (título, descripción, icono).
 * Se obtiene la configuración de la tienda para personalizar estos valores.
 * @returns {Promise<Metadata>} Objeto de metadata para Next.js.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const storeConfig = await getStoreConfigFromDb();
    if (storeConfig) {
      return {
        title: {
          default: storeConfig.name,
          template: `%s | ${storeConfig.name}`,
        },
        description: storeConfig.description,
        icons: {
          icon: '/favicon.ico',
        },
      };
    }
  } catch (error) {
    console.error("Error generating metadata, using fallback:", error);
  }

  return {
    title: "Coral Cart",
    description: "Tu tienda de equipamiento deportivo de alto rendimiento.",
    icons: {
      icon: '/favicon.ico',
    },
  };
}

/**
 * Componente RootLayout que envuelve toda la aplicación.
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Los componentes hijos que serán renderizados dentro del layout.
 * @returns {Promise<JSX.Element>} El layout raíz de la aplicación.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbStatus = await checkDbConnection();
  if (!dbStatus.connected) {
    return <DbConnectionError />;
  }

  const storeConfig = await getStoreConfigFromDb();

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-body antialiased", inter.variable, spaceGrotesk.variable)} suppressHydrationWarning>
        <Providers>
            <SiteLayout storeConfig={storeConfig}>
                {children}
            </SiteLayout>
        </Providers>
      </body>
    </html>
  );
}
