/**
 * @fileoverview Gestor de iconos para la aplicación.
 * Centraliza la importación de iconos desde `lucide-react` y proporciona
 * un componente <Icon /> dinámico para renderizarlos por nombre.
 * Esto evita tener que importar cada icono individualmente en cada componente.
 */

'use client';
import React from 'react';
import { Shield, Shirt, Wind, Footprints, Tag, Sprout, Rocket, Trophy, Gamepad2, ShoppingBag, Info } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

// Objeto que mapea los nombres de los iconos a sus componentes de lucide-react.
export const availableIcons = {
  Shield,
  Shirt,
  Wind,
  Footprints,
  Tag,
  Sprout,
  Rocket,
  Trophy,
  Gamepad2,
  ShoppingBag,
  Info,
};

// Tipo que define los nombres válidos de los iconos disponibles.
export type IconName = keyof typeof availableIcons;

// Array con la lista de nombres de iconos, útil para selectores en formularios.
export const iconList = Object.keys(availableIcons) as IconName[];

/**
 * Componente dinámico para renderizar un icono por su nombre.
 * @param {object} props - Propiedades del componente.
 * @param {IconName} props.name - El nombre del icono a renderizar.
 * @param {LucideProps} props - Otras propiedades a pasar al icono de lucide (e.g., className, size).
 * @returns {JSX.Element | null} El componente del icono o null si no se encuentra.
 */
export const Icon = ({ name, ...props }: { name: IconName } & LucideProps) => {
  const LucideIcon = availableIcons[name];
  // Si el nombre del icono no existe, no renderiza nada.
  if (!LucideIcon) return null;
  // Crea y devuelve el elemento del icono con las propiedades pasadas.
  return React.createElement(LucideIcon, props);
};
