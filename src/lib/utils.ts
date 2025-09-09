import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Product, Discount } from '@/types';
import type { ReadonlyURLSearchParams } from "next/navigation";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const calculateDiscountedPrice = (product: Product, allDiscounts: Discount[]): { originalPrice: number; finalPrice: number; discount: Discount } | null => {
    const applicableDiscounts = allDiscounts.filter(d => 
        d.status === 'Activo' && 
        d.applicableProductIds && d.applicableProductIds.includes(product.id) &&
        (d.type === 'Porcentaje' || d.type === 'Fijo')
    );

    if (applicableDiscounts.length === 0) return null;
    const discount = applicableDiscounts[0];
    
    let finalPrice = product.price;
    if (discount.type === 'Porcentaje') {
        finalPrice = product.price * (1 - discount.value / 100);
    } else if (discount.type === 'Fijo') {
        finalPrice = product.price - discount.value;
    }

    finalPrice = Math.max(0, finalPrice);

    return {
        originalPrice: product.price,
        finalPrice,
        discount
    };
};

export const updateSearchParams = (
    currentParams: ReadonlyURLSearchParams,
    newParams: Record<string, string | null>
) => {
    const params = new URLSearchParams(currentParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all' || (key === 'sort' && value === 'relevance')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Si se está actualizando un filtro que no es la página, reiniciar la paginación.
    const isPaging = Object.keys(newParams).length === 1 && 'page' in newParams;
    if (!isPaging) {
        params.set('page', '1');
    }

    return params.toString();
};
