
'use client';

import { useState } from 'react';
import type { Discount, Product, Customization } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check } from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface ComboOfferCardProps {
  combo: Discount;
  products: Product[];
}

const PATCH_PRICE = 5;
const NAME_NUMBER_PRICE = 5;

export default function ComboOfferCard({ combo, products }: ComboOfferCardProps) {
  const { addComboToCart } = useCart();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [customizations, setCustomizations] = useState<Record<string, Customization>>(() => {
    const initialState: Record<string, Customization> = {};
    products.forEach(p => {
        initialState[p.id] = { patches: false, nameAndNumber: false, notes: '', size: p.sizes?.[0] };
    });
    return initialState;
  });

  const originalPrice = products.reduce((sum, p) => sum + p.price, 0);
  
  const handleCustomizationChange = (productId: string, key: keyof Customization, value: any) => {
    setCustomizations(prev => ({
        ...prev,
        [productId]: { ...prev[productId], [key]: value }
    }));
  };
  
  const isAddToCartDisabled = products.some(p => {
    const custom = customizations[p.id];
    const hasSizeRequirement = p.sizes && p.sizes.length > 0 && !custom?.size;
    const hasCustomizationRequirement = (custom?.patches || custom?.nameAndNumber) && (!custom?.notes || custom.notes.trim() === '');
    return hasSizeRequirement || hasCustomizationRequirement;
  });


  const handleAddToCart = () => {
    if (isAddToCartDisabled) {
        toast({
            title: "Faltan Opciones",
            description: "Por favor, selecciona una talla y/o añade notas de personalización para todos los productos que lo requieran.",
            variant: "destructive",
        });
        return;
    }

    const itemsToAdd = products.map(product => ({
        product,
        quantity: 1,
        customization: customizations[product.id] || {}
    }));

    addComboToCart(itemsToAdd, combo.value, combo.name);
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle>{combo.name}</CardTitle>
          <CardDescription>¡Lleva todos estos productos a un precio especial!</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-2">
              {products.slice(0, 4).map(product => (
                  <div key={product.id} className="relative aspect-square rounded-md overflow-hidden border">
                      <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="25vw"
                          className="object-cover"
                      />
                  </div>
              ))}
          </div>
          <ul className="text-sm text-muted-foreground list-disc list-inside">
              {products.map(product => (
                  <li key={product.id} className="truncate">{product.name}</li>
              ))}
          </ul>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4 p-4 border-t bg-muted/50">
          <div className="w-full flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Precio del Combo:</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-destructive">${combo.value.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground line-through">Antes: ${originalPrice.toFixed(2)}</p>
              </div>
          </div>
          <DialogTrigger asChild>
            <Button className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Añadir Combo al Carrito
            </Button>
          </DialogTrigger>
        </CardFooter>
      </Card>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personaliza tu Combo: {combo.name}</DialogTitle>
          <DialogDescription>
            Elige las opciones para cada producto antes de añadirlo al carrito.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {products.map((product, index) => {
            const hasSizeOption = product.sizes && product.sizes.length > 0;
            const allowPatches = product.customizationOptions?.patches;
            const allowNameNumber = product.customizationOptions?.nameAndNumber;
            const custom = customizations[product.id] || {};
            
            return (
              <div key={product.id}>
                <div className="flex items-start gap-4">
                  <Image src={product.image} alt={product.name} width={80} height={80} className="rounded-md border object-cover" />
                  <div className="flex-1">
                    <p className="font-semibold">{product.name}</p>
                     {hasSizeOption && (
                        <div className="mt-2">
                          <Label className="text-sm font-semibold">Talla</Label>
                           <RadioGroup
                                value={custom.size}
                                onValueChange={(size) => handleCustomizationChange(product.id, 'size', size)}
                                className="flex flex-wrap gap-2 mt-1"
                            >
                                {product.sizes?.map(size => (
                                <Label key={size} htmlFor={`${product.id}-size-${size}`} className={cn("border rounded-md transition-colors cursor-pointer text-xs font-medium px-2.5 py-1.5 hover:bg-accent", custom.size === size && "bg-primary text-primary-foreground border-primary")}>
                                    <RadioGroupItem value={size} id={`${product.id}-size-${size}`} className="sr-only" />
                                    {size}
                                </Label>
                                ))}
                            </RadioGroup>
                        </div>
                     )}
                     {(allowPatches || allowNameNumber) && (
                        <div className="mt-3 space-y-2">
                           {allowPatches && (
                                <div className="flex items-center justify-between text-sm">
                                    <Label htmlFor={`patches-${product.id}`}>Añadir Parches (+${PATCH_PRICE.toFixed(2)})</Label>
                                    <Switch id={`patches-${product.id}`} checked={custom.patches} onCheckedChange={(c) => handleCustomizationChange(product.id, 'patches', c)}/>
                                </div>
                           )}
                           {allowNameNumber && (
                                <div className="flex items-center justify-between text-sm">
                                    <Label htmlFor={`name-${product.id}`}>Nombre y Dorsal (+${NAME_NUMBER_PRICE.toFixed(2)})</Label>
                                    <Switch id={`name-${product.id}`} checked={custom.nameAndNumber} onCheckedChange={(c) => handleCustomizationChange(product.id, 'nameAndNumber', c)}/>
                                </div>
                           )}
                           {(custom.patches || custom.nameAndNumber) && (
                                <div>
                                   <Label htmlFor={`custom-notes-${product.id}`} className="text-sm font-medium">Notas de Personalización (requerido)</Label>
                                   <Textarea
                                     id={`custom-notes-${product.id}`}
                                     value={custom.notes}
                                     onChange={(e) => handleCustomizationChange(product.id, 'notes', e.target.value)}
                                     placeholder={
                                       custom.patches && !custom.nameAndNumber ? 'Ej: Parche de la Champions League' :
                                       !custom.patches && custom.nameAndNumber ? 'Ej: RONALDO / 7' :
                                       'Ej: Parche Champions League, Nombre: RONALDO, Dorsal: 7'
                                     }
                                     className="mt-1 text-xs"
                                     required={custom.patches || custom.nameAndNumber}
                                   />
                                </div>
                            )}
                        </div>
                     )}
                  </div>
                </div>
                {index < products.length - 1 && <Separator className="my-6"/>}
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={handleAddToCart} disabled={isAddToCartDisabled}>
              <Check className="mr-2 h-4 w-4" />
              Confirmar y Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
