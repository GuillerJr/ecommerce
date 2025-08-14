
/**
 * @fileoverview Componente del lado del cliente que agrupa todos los proveedores de contexto.
 * Esta separación es necesaria para evitar conflictos de renderizado entre
 * Server Components (como el layout raíz) y Client Components (los proveedores).
 */

'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { ComparisonProvider } from '@/contexts/ComparisonContext';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from "@/components/ui/toaster";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <FavoritesProvider>
          <ComparisonProvider>
            <CartProvider>
              {children}
              <Toaster />
            </CartProvider>
          </ComparisonProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
