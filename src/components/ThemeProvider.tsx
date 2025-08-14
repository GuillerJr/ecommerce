/**
 * @fileoverview Proveedor de tema para la aplicación.
 * Utiliza la librería `next-themes` para gestionar el cambio entre
 * tema claro, oscuro y el tema del sistema.
 */

'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

/**
 * Componente que envuelve la aplicación para proporcionar el contexto del tema.
 * @param {ThemeProviderProps} props - Propiedades del proveedor de tema, incluyendo `children`.
 * @returns {JSX.Element} El proveedor de tema con la aplicación hija.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Renderiza el proveedor de next-themes, pasando todas las props.
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
