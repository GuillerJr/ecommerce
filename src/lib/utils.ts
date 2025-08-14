import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Product, Discount } from '@/types';

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
