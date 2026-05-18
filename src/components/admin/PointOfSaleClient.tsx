

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Product, Coupon, Discount, CartItem, StoreConfig, User } from '@/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Search, Tablet, X, Plus, Minus, UserCheck, User as UserIcon, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createOrderAction, getCouponByCodeAction, getStoreConfigAction } from '@/lib/actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { calculateDiscountedPrice } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '../ui/badge';


const customerSchema = z.object({
  useCustomCustomer: z.boolean().default(false),
  customerName: z.string().optional(),
  customerEmail: z.string().email({ message: "Correo inválido." }).optional().or(z.literal('')),
  customerIdentification: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.useCustomCustomer) {
    if (!data.customerName || data.customerName.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['customerName'], message: 'El nombre es requerido.' });
    }
    if (!data.customerIdentification || data.customerIdentification.length < 5) {
      ctx.addIssue({ code: 'custom', path: ['customerIdentification'], message: 'La identificación es requerida y debe tener al menos 5 caracteres.' });
    }
  }
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface PointOfSaleClientProps {
  allProducts: Product[];
  allCoupons: Coupon[];
  allDiscounts: Discount[];
}

export default function PointOfSaleClient({ allProducts, allDiscounts }: PointOfSaleClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getStoreConfigAction().then(result => {
        if (result.success) {
            setStoreConfig(result.config);
        }
    });
  }, []);

  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { useCustomCustomer: false, customerName: '', customerEmail: '', customerIdentification: '' },
  });

  const useCustomerWatcher = customerForm.watch('useCustomCustomer');

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return allProducts;
    return allProducts.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allProducts]);

  const addToCart = (product: Product) => {
    const discountInfo = calculateDiscountedPrice(product, allDiscounts);
    const price = discountInfo?.finalPrice ?? product.price;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        if (product.saleType === 'stock' && existingItem.quantity >= product.stock) {
          toast({ title: 'Stock máximo alcanzado', variant: 'destructive' });
          return prevCart;
        }
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.saleType === 'stock' && product.stock < 1) {
        toast({ title: 'Producto sin stock', variant: 'destructive' });
        return prevCart;
      }
      return [...prevCart, { id: product.id, product, quantity: 1, price, customization: {} }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart => {
      if (newQuantity <= 0) {
        return prevCart.filter(item => item.product.id !== productId);
      }
      return prevCart.map(item =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };
  
    const { subtotal, couponDiscount, taxAmount, total } = useMemo(() => {
        const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        
        let couponDisc = 0;
        if (appliedCoupon) {
            if (appliedCoupon.type === 'Fijo' && appliedCoupon.value) couponDisc = appliedCoupon.value;
            if (appliedCoupon.type === 'Porcentaje' && appliedCoupon.value) couponDisc = sub * (appliedCoupon.value / 100);
        }

        const priceAfterDiscount = sub - couponDisc;
        const tax = (storeConfig?.taxRate ?? 0) > 0 ? priceAfterDiscount * (storeConfig!.taxRate! / 100) : 0;
        const finalTotal = Math.max(0, priceAfterDiscount + tax);

        return { 
            subtotal: sub, 
            couponDiscount: couponDisc,
            taxAmount: tax,
            total: finalTotal
        };

    }, [cart, appliedCoupon, storeConfig]);

  const handleApplyCoupon = async () => {
    const result = await getCouponByCodeAction(couponCode);
    if(result.success && result.coupon) {
        setAppliedCoupon(result.coupon);
        toast({ title: `Cupón ${result.coupon.code} aplicado.` });
    } else {
        setAppliedCoupon(null);
        toast({ title: "Cupón inválido", variant: 'destructive' });
    }
  };

  const handleProcessSale = async (values: CustomerFormValues) => {
    if (cart.length === 0) {
      toast({ title: "El carrito está vacío", variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true);

    const orderData = {
        userId: user?.id,
        customerName: values.useCustomCustomer && values.customerName ? values.customerName : 'Consumidor Final',
        email: values.useCustomCustomer && values.customerEmail ? values.customerEmail : `pos-sale-${Date.now()}@hacktrick.store`,
        paymentMethod: 'Punto de Venta' as const,
        identification: values.useCustomCustomer && values.customerIdentification ? values.customerIdentification : '9999999999'
    };

    const result = await createOrderAction(orderData, cart, storeConfig?.taxRate || 0, appliedCoupon?.code);

    if (result.success) {
        toast({ title: "Venta procesada exitosamente", description: `Pedido #${result.order.id.substring(0,8)} creado.` });
        setCart([]);
        setCouponCode('');
        setAppliedCoupon(null);
        customerForm.reset();
        router.refresh(); // To update product stock counts if they change
    } else {
        toast({ title: "Error al procesar la venta", description: result.message, variant: 'destructive' });
    }

    setIsProcessing(false);
  };


  return (
    <div className="flex h-[calc(100dvh-theme(spacing.20))] flex-col p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-secondary p-3 rounded-full border">
                <Tablet className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
                <h1 className="text-3xl font-bold">Punto de Venta</h1>
                <p className="text-muted-foreground">Gestiona ventas presenciales de forma rápida y sencilla.</p>
            </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8 flex-1 md:overflow-hidden">
            {/* Product Selection */}
            <div className="md:col-span-2 flex flex-col min-h-0">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar productos..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <ScrollArea className="flex-1 -mx-4 md:overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map(product => {
                                const discountInfo = calculateDiscountedPrice(product, allDiscounts);
                                return (
                                    <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group" onClick={() => addToCart(product)}>
                                        <div className="aspect-[4/5] relative bg-secondary/50">
                                            <Image src={product.image} alt={product.name} fill sizes="20vw" className="object-contain transition-transform group-hover:scale-105 p-1" />
                                            {discountInfo && (
                                                <Badge variant="destructive" className="absolute top-2 left-2">OFERTA</Badge>
                                            )}
                                        </div>
                                        <div className="p-3 text-xs">
                                            <h3 className="font-medium truncate">{product.name}</h3>
                                            {discountInfo ? (
                                                <div className="font-semibold">
                                                    <span className="text-destructive">${discountInfo.finalPrice.toFixed(2)}</span>
                                                    <span className="text-muted-foreground line-through ml-2">${discountInfo.originalPrice.toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                <p className="font-semibold">${product.price.toFixed(2)}</p>
                                            )}
                                        </div>
                                    </Card>
                                )
                            })
                         ) : (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                                <p>No se encontraron productos.</p>
                            </div>
                         )}
                    </div>
                </ScrollArea>
            </div>

            {/* Cart and Checkout */}
            <div className="flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>Venta Actual</CardTitle>
                    </CardHeader>
                    <Form {...customerForm}>
                        <form onSubmit={customerForm.handleSubmit(handleProcessSale)} className="flex-1 flex flex-col min-h-0">
                            <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
                                <div className="space-y-3 rounded-lg border p-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="custom-customer" className="flex items-center gap-2 font-semibold">
                                            {useCustomerWatcher ? <UserCheck className="h-5 w-5 text-primary" /> : <UserIcon className="h-5 w-5" />}
                                            {useCustomerWatcher ? 'Datos del Cliente' : 'Consumidor Final'}
                                        </Label>
                                        <FormField control={customerForm.control} name="useCustomCustomer" render={({ field }) => (
                                            <FormControl>
                                                <Switch id="custom-customer" checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        )} />
                                    </div>
                                    {useCustomerWatcher && (
                                        <div className="space-y-3 pt-2 border-t">
                                            <FormField control={customerForm.control} name="customerName" render={({ field }) => (
                                                <FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={customerForm.control} name="customerIdentification" render={({ field }) => (
                                                <FormItem><FormLabel>Identificación</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={customerForm.control} name="customerEmail" render={({ field }) => (
                                                <FormItem><FormLabel>Email (opcional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                <ScrollArea className="flex-1 -mx-6">
                                    <div className="px-6 space-y-4">
                                        {cart.length > 0 ? cart.map(item => (
                                            <div key={item.id} className="flex items-center gap-3">
                                                <Image src={item.product.image} alt={item.product.name} width={48} height={48} className="rounded-md border aspect-square object-contain p-1 bg-secondary/50" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                                                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center border rounded-md">
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                                                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateQuantity(item.product.id, 0)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        )) : (
                                            <p className="text-center text-sm text-muted-foreground py-8">El carrito está vacío</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="flex-col gap-4 !p-4 border-t">
                                <div className="w-full flex gap-2">
                                    <Input placeholder="Código de cupón" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                                    <Button type="button" variant="outline" onClick={handleApplyCoupon}>Aplicar</Button>
                                </div>
                                <div className="w-full space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-destructive">
                                            <span>Descuento ({appliedCoupon.code})</span>
                                            <span>-${couponDiscount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {storeConfig && (storeConfig.taxRate || 0) > 0 && (
                                        <div className="flex justify-between">
                                            <span>IVA ({storeConfig.taxRate || 0}%)</span>
                                            <span>${taxAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>
                                </div>
                                <Button type="submit" size="lg" className="w-full" disabled={isProcessing || cart.length === 0}>
                                    {isProcessing ? 'Procesando...' : `Procesar Venta ($${total.toFixed(2)})`}
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            </div>
        </div>
    </div>
  );
}
