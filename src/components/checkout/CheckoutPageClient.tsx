

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CartItem from "@/components/cart/CartItem";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { ShoppingBag, Tag, Home, Briefcase, User as UserIcon, LogIn, Loader2, CreditCard, PlusCircle, UserCheck, AlertCircle } from "lucide-react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { Coupon, Address, StoreConfig, Product } from "@/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from '../ui/switch';
import { createOrderAction, checkStockAction } from "@/lib/actions/orders";
import { addAddressAction } from "@/lib/actions/users";
import { getCouponByCodeAction } from "@/lib/actions/coupons";
import { createPaypalOrderAction, capturePaypalOrderAction } from "@/lib/actions/paypal";
import { getProductsAction } from "@/lib/actions/products";
import { Alert, AlertDescription as AlertDescriptionComponent, AlertTitle } from "@/components/ui/alert";


const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre es requerido." }),
  email: z.string().email({ message: "Correo electrónico inválido." }),
  address: z.string().min(1, { message: "Debes seleccionar o añadir una dirección de envío." }),
  city: z.string().min(1, { message: "La ciudad es requerida." }),
  postalCode: z.string().min(1, { message: "El código postal es requerido." }),
  country: z.string().min(1, { message: "El país es requerido." }),
});

const addressSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  address: z.string().min(5, "La dirección es muy corta."),
  city: z.string().min(2, "La ciudad es muy corta."),
  postalCode: z.string().min(4, "El código postal es muy corto."),
  country: z.string().min(2, "El país es muy corto."),
  isDefault: z.boolean().default(false),
});
type AddressFormValues = z.infer<typeof addressSchema>;

const PayPalPaymentButtons = ({ isValid, createOrder, onApprove, onError }: { isValid: boolean, createOrder: () => Promise<string>, onApprove: (data: any) => Promise<void>, onError: (err: any) => void }) => {
    const [{ isPending, isRejected }] = usePayPalScriptReducer();

    if (isPending) {
        return <div className="flex h-20 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (isRejected) {
        return (
            <div className="text-center text-sm text-destructive p-4 border border-destructive/50 rounded-md">
                Error al cargar el módulo de pago. Por favor, comprueba tu conexión o recarga la página.
            </div>
        );
    }

    return (
        <PayPalButtons
            style={{ layout: "vertical", color: "black" }}
            disabled={!isValid}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onError}
        />
    );
};

export default function CheckoutPageClient({ storeConfig }: { storeConfig: StoreConfig }) {
  const { toast } = useToast();
  const { cartItems, totalPrice, clearCart } = useCart();
  const { user, loading, updateUser } = useAuth();
  const router = useRouter();

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [isVerifyingStock, setIsVerifyingStock] = useState(false);

  const subtotal = totalPrice;
  const priceAfterDiscount = subtotal - couponDiscount;
  
  const taxAmount = useMemo(() => {
    if (!storeConfig || !storeConfig.taxRate) return 0;
    return priceAfterDiscount * (storeConfig.taxRate / 100);
  }, [priceAfterDiscount, storeConfig]);

  const hasOnDemandProducts = useMemo(() => {
    return cartItems.some(item => item.product.saleType === 'on_demand');
  }, [cartItems]);


  const finalPrice = priceAfterDiscount + taxAmount;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: { name: "", email: "", address: "", city: "", postalCode: "", country: "" },
  });

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { name: "", address: "", city: "", postalCode: "", country: "", isDefault: false },
  });

  useEffect(() => {
    if (!loading && user) {
        form.setValue('name', user.name);
        form.setValue('email', user.email);
        const defaultAddress = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
        if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
        } else if (!user.addresses || user.addresses.length === 0) {
            setIsAddressDialogOpen(true);
        }
    }
  }, [user, loading, form]);

  useEffect(() => {
    if (selectedAddressId && user?.addresses) {
        const selectedAddress = user.addresses.find(a => a.id === selectedAddressId);
        if (selectedAddress) {
            form.setValue('address', selectedAddress.address);
            form.setValue('city', selectedAddress.city);
            form.setValue('postalCode', selectedAddress.postalCode);
            form.setValue('country', selectedAddress.country);
            form.trigger();
        }
    }
  }, [selectedAddressId, user?.addresses, form]);

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId || !user?.addresses) return null;
    return user.addresses.find(a => a.id === selectedAddressId);
  }, [selectedAddressId, user?.addresses]);


  const handleApplyCoupon = async () => {
    const result = await getCouponByCodeAction(couponCode);
    const coupon = result.coupon;
    if (coupon) {
      let discount = 0;
      if (coupon.type === 'Porcentaje' && coupon.value) {
        discount = totalPrice * (coupon.value / 100);
      } else if (coupon.type === 'Fijo' && coupon.value) {
        discount = coupon.value;
      }
      setCouponDiscount(discount);
      setAppliedCoupon(coupon);
      toast({ title: "Cupón aplicado", description: `Se ha aplicado el cupón ${coupon.code}.` });
    } else {
      setCouponDiscount(0);
      setAppliedCoupon(null);
      toast({ title: "Cupón inválido", description: "El código de cupón no es válido o ha expirado.", variant: "destructive" });
    }
  };

  const handleAddressSubmit = async (values: AddressFormValues) => {
    if (!user) return;
    
    const result = await addAddressAction(user.id, values);
    const updatedUser = result.user;
    if (updatedUser) {
        updateUser(updatedUser);
        const newAddress = updatedUser.addresses?.[updatedUser.addresses.length - 1];
        if (newAddress) {
            setSelectedAddressId(newAddress.id);
        }
        toast({ title: "Dirección añadida" });
    }
    
    setIsAddressDialogOpen(false);
    addressForm.reset();
  };
  
  const handlePaypalSuccess = useCallback(async () => {
    if (!selectedAddress || !storeConfig || !user) {
        toast({ title: "Error", description: "Falta información para completar el pedido.", variant: "destructive" });
        return;
    }

    let phoneNumber: string | undefined;
    if (user.phone) {
        let phoneObj;
        try {
            // Si user.phone es un string JSON, lo parseamos. Si ya es un objeto, lo usamos directamente.
            phoneObj = typeof user.phone === 'string' ? JSON.parse(user.phone) : user.phone;
            if (phoneObj && phoneObj.countryCode && phoneObj.number) {
              phoneNumber = `${phoneObj.countryCode}${phoneObj.number}`;
            }
        } catch (e) {
            console.error('Error parsing phone JSON from user object:', e);
            phoneNumber = undefined;
        }
    }

    const orderDetails = {
        userId: user.id,
        customerName: form.getValues('name'),
        email: form.getValues('email'),
        phone: phoneNumber,
        identification: user.identification,
        shippingAddress: selectedAddress,
        paymentMethod: 'PayPal' as const
    };

    const result = await createOrderAction(
        orderDetails,
        cartItems,
        storeConfig.taxRate || 0,
        appliedCoupon?.code
    );

    if (result.success) {
        toast({ title: "Pedido Realizado", description: "¡Gracias por tu compra! Tu pago ha sido procesado." });
        clearCart();
        router.push('/pedidos');
    } else {
        toast({ title: "Error en el pedido", description: result.message, variant: "destructive" });
    }
  }, [selectedAddress, storeConfig, user, form, cartItems, appliedCoupon?.code, toast, clearCart, router]);
  
  const handleContinueToPayment = async () => {
    setIsVerifyingStock(true);
    const result = await checkStockAction(cartItems);
    if (result.success) {
      setIsPaymentStep(true);
    } else {
      toast({
        title: "Stock insuficiente",
        description: `No se puede proceder: ${result.message}`,
        variant: "destructive",
        duration: 10000,
      });
    }
    setIsVerifyingStock(false);
  };

  const paypalEnabled = storeConfig?.paymentGateways?.paypal?.enabled && storeConfig?.paymentGateways?.paypal?.clientId;

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <UserIcon className="mx-auto h-16 w-16 text-muted-foreground" />
            <h1 className="text-2xl font-bold mt-4">Debes iniciar sesión</h1>
            <p className="text-muted-foreground mt-2">Para continuar con el pago, por favor, inicia sesión en tu cuenta.</p>
            <Button asChild className="mt-6">
              <Link href="/login?from=/checkout">
                <LogIn className="mr-2" />
                Iniciar Sesión
              </Link>
            </Button>
        </div>
    )
  }

  if (cartItems.length === 0) {
      return (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
              <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
              <h1 className="text-2xl font-bold mt-4">Tu carrito está vacío</h1>
              <p className="text-muted-foreground mt-2">Parece que aún no has añadido nada. ¡Explora nuestros productos!</p>
              <Button asChild className="mt-6">
                <Link href="/tienda">Ir a la tienda</Link>
              </Button>
          </div>
      )
  }
  
  return (
    
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
                <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Proceso de Pago</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Estás a solo un paso de completar tu pedido.
                </p>
            </div>

            {hasOnDemandProducts && (
                <Alert className="mb-8">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Aviso sobre Pedidos Bajo Demanda</AlertTitle>
                  <AlertDescriptionComponent>
                    Tu pedido incluye artículos que se importan bajo demanda. El tiempo de importación estimado es de 3 a 4 semanas. Ocasionalmente, pueden ocurrir demoras adicionales por motivos logísticos o aduaneros ajenos a la tienda.
                  </AlertDescriptionComponent>
                </Alert>
            )}

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                <div className="lg:order-2">
                    <Form {...form}>
                    <form className="space-y-8">
                        <Card>
                            <CardHeader><CardTitle>1. Información de Envío</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                
                                <Separator />
                                <Label>Dirección de Envío</Label>
                                
                                {(user.addresses?.length ?? 0) > 0 ? (
                                    <RadioGroup onValueChange={setSelectedAddressId} value={selectedAddressId}>
                                        {user.addresses?.map(addr => (
                                            <Label key={addr.id} htmlFor={addr.id} className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[input:checked]:bg-accent has-[input:checked]:border-primary">
                                                <RadioGroupItem value={addr.id} id={addr.id} />
                                                <div className="flex-1">
                                                    <div className="font-semibold flex items-center gap-2">
                                                        {addr.name.toLowerCase().includes('casa') ? <Home className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                                                        {addr.name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{addr.address}, {addr.city}, {addr.postalCode}</div>
                                                </div>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-md">
                                      No tienes direcciones guardadas.
                                  </div>
                                )}

                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Añadir Nueva Dirección
                                    </Button>
                                </DialogTrigger>
                                <FormMessage>{form.formState.errors.address?.message}</FormMessage>

                            </CardContent>
                        </Card>

                        {!isPaymentStep ? (
                          <Button 
                            type="button" 
                            size="lg" 
                            className="w-full"
                            disabled={!form.formState.isValid || isVerifyingStock}
                            onClick={handleContinueToPayment}
                          >
                             {isVerifyingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <CreditCard className="mr-2 h-5 w-5" />
                            Continuar al Pago
                          </Button>
                        ) : (
                          <Card>
                              <CardHeader><CardTitle>2. Método de Pago</CardTitle></CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground pb-4">
                                    Completa tu compra de forma segura con PayPal. Puedes usar tu saldo de PayPal o pagar con tarjeta de crédito/débito.
                                </p>
                                <div className="pt-4 border-t relative isolate">
                                  {paypalEnabled ? (
                                      <PayPalPaymentButtons
                                          isValid={form.formState.isValid}
                                          createOrder={async () => {
                                              if (!selectedAddress) {
                                                  toast({ title: "Error", description: "Por favor, selecciona una dirección de envío.", variant: "destructive" });
                                                  throw new Error("No address selected");
                                              }
                                              const result = await createPaypalOrderAction(finalPrice.toFixed(2), storeConfig.currency.code, selectedAddress);
                                              if (result.success && result.orderId) {
                                                  return result.orderId;
                                              }
                                              toast({ title: "Error", description: result.message || "No se pudo crear el pedido de PayPal.", variant: "destructive" });
                                              throw new Error(result.message || "Failed to create PayPal order.");
                                          }}
                                          onApprove={async (data) => {
                                              if (!selectedAddress || !storeConfig || !user) {
                                                  toast({ title: "Error", description: "Por favor, selecciona una dirección de envío o la configuración no está disponible.", variant: "destructive" });
                                                  return;
                                              }
                                              const captureResult = await capturePaypalOrderAction(data.orderID);
                                              if (!captureResult.success) {
                                                toast({ title: "Error en el pago", description: "No se pudo capturar el pago de PayPal.", variant: "destructive" });
                                                return;
                                              }
                                              await handlePaypalSuccess();
                                          }}
                                          onError={(err) => {
                                              console.error("PayPal Buttons Error:", err);
                                              toast({ title: "Error de PayPal", description: "Ocurrió un error inesperado con PayPal.", variant: "destructive" });
                                          }}
                                      />
                                  ) : (
                                    <div className="text-center text-sm text-muted-foreground p-4">La opción de pago con PayPal no está disponible.</div>
                                  )}
                                </div>
                              </CardContent>
                          </Card>
                        )}
                    </form>
                    </Form>
                </div>
                <div className="lg:order-1">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Resumen del Pedido</h2>
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-4">
                                {cartItems.map(item => (
                                    <CartItem key={item.id} item={item} />
                                ))}
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold">Cupón de Descuento</h3>
                              <div className="flex gap-2">
                                <Input placeholder="Código de cupón" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                                <Button type="button" variant="outline" onClick={handleApplyCoupon}><Tag className="mr-2 h-4 w-4"/> Aplicar</Button>
                              </div>
                            </div>
                            <Separator />
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-destructive">
                                        <span>Descuento ({appliedCoupon.code})</span>
                                        <span>-{couponDiscount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                    </div>
                                )}
                                {storeConfig && storeConfig.taxRate > 0 && (
                                    <div className="flex justify-between">
                                        <span>IVA ({storeConfig.taxRate}%)</span>
                                        <span>{taxAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                    </div>
                                )}
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{(finalPrice > 0 ? finalPrice : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                            </div>
                        </CardContent>
                      </Card>
                  </div>
                </div>
            </div>
        </div>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Añadir Nueva Dirección</DialogTitle>
            </DialogHeader>
            <Form {...addressForm}>
                <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4 py-4">
                    <FormField control={addressForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nombre (ej. Casa, Oficina)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={addressForm.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={addressForm.control} name="city" render={({ field }) => (
                            <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={addressForm.control} name="postalCode" render={({ field }) => (
                            <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={addressForm.control} name="country" render={({ field }) => (
                        <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={addressForm.control} name="isDefault" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5"><FormLabel>Establecer como predeterminada</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddressDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
  );
}
