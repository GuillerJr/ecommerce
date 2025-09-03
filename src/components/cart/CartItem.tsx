
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CartItem } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Minus, Plus, X } from 'lucide-react';

interface CartItemProps {
  item: CartItem;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart();

  const handleQuantityChange = (newQuantity: number) => {
    updateQuantity(item.id, newQuantity);
  };
  
  const PATCH_PRICE = 5;
  const NAME_NUMBER_PRICE = 5;

  const originalPriceWithCustomization = item.product.price 
    + (item.customization.patches ? PATCH_PRICE : 0) 
    + (item.customization.nameAndNumber ? NAME_NUMBER_PRICE : 0);
  
  const hasDiscount = item.price < originalPriceWithCustomization;

  return (
    <div className="flex items-start gap-4">
      <Link href={`/product/${item.product.id}`} className="block flex-shrink-0">
        <div className="aspect-square w-20 h-20 rounded-md overflow-hidden border bg-secondary/50">
           <Image
            src={item.product.image}
            alt={item.product.name}
            width={80}
            height={80}
            className="object-contain"
          />
        </div>
      </Link>
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <Link href={`/product/${item.product.id}`} className="font-semibold text-sm hover:underline line-clamp-2">
              {item.product.name}
            </Link>
             <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                {item.customization.size && <div>Talla: {item.customization.size}</div>}
                {item.customization.patches && <div>+ Parches</div>}
                {item.customization.nameAndNumber && <div>+ Nombre y Dorsal</div>}
                {item.customization.notes && <div className="truncate" title={item.customization.notes}>Nota: {item.customization.notes}</div>}
             </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 flex-shrink-0" onClick={() => removeFromCart(item.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
           <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item.quantity - 1)}>
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item.quantity + 1)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-right">
             {hasDiscount ? (
                <>
                  <p className="font-semibold text-sm text-destructive">${(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground line-through">${(originalPriceWithCustomization * item.quantity).toFixed(2)}</p>
                </>
              ) : (
                <p className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
              )}
             {item.quantity > 1 && <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
