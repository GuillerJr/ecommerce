
'use client';

import { SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import CartItem from './CartItem';
import Link from 'next/link';
import type { StoreConfig } from '@/types';
import { useMemo } from 'react';

export default function CartSheet({ storeConfig }: { storeConfig: StoreConfig }) {
  const { cartItems, cartCount, totalPrice } = useCart();

  const taxAmount = useMemo(() => {
    if (!storeConfig || !storeConfig.taxRate || storeConfig.taxRate <= 0) return 0;
    return totalPrice * (storeConfig.taxRate / 100);
  }, [totalPrice, storeConfig]);

  const finalPrice = totalPrice + taxAmount;

  return (
    <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
      <SheetHeader className="px-6">
        <SheetTitle>Carrito de Compras ({cartCount})</SheetTitle>
      </SheetHeader>
      <Separator />
      {cartCount > 0 ? (
        <>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-6 p-6">
              {cartItems.map(item => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <SheetFooter className="p-6">
            <div className="w-full space-y-4">
               <div className="w-full space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    {storeConfig.taxRate > 0 && (
                        <div className="flex justify-between">
                            <span>IVA ({storeConfig.taxRate}%)</span>
                            <span>${taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${finalPrice.toFixed(2)}</span>
                    </div>
                </div>
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout">Proceder al Pago</Link>
              </Button>
            </div>
          </SheetFooter>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Tu carrito está vacío</h3>
            <p className="text-sm text-muted-foreground mt-2">¡Añade algunos productos para empezar!</p>
            <Button asChild className="mt-4">
              <Link href="/tienda">Seguir Comprando</Link>
            </Button>
          </div>
        </div>
      )}
    </SheetContent>
  );
}
