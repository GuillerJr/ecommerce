

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Product, Review, Customization, Category, Discount, StoreConfig, Brand } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { Minus, Plus, ShoppingCart, Star, Heart, LogIn, Share2, Copy, Bell, Check, Mail, Linkedin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn, calculateDiscountedPrice } from '@/lib/utils';
import { addReviewAction } from '@/lib/actions/reviews';
import { addRecentlyViewedProductAction } from '@/lib/actions/users';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { QRCodeCanvas } from 'qrcode.react';
import { FaFacebookF, FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useTheme } from 'next-themes';


const reviewSchema = z.object({
  author: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  rating: z.coerce.number().min(1, "Debes seleccionar una calificación.").max(5),
  text: z.string().min(10, "La reseña debe tener al menos 10 caracteres."),
});

const PATCH_PRICE = 5;
const NAME_NUMBER_PRICE = 5;

/**
 * Componente del lado del cliente para mostrar los detalles de un producto.
 * Maneja la lógica de selección de imágenes, personalización, añadir al carrito,
 * escribir reseñas y compartir el producto.
 * 
 * @param {object} props - Propiedades del componente.
 * @param {Product} props.product - El objeto del producto a mostrar.
 * @param {Category} [props.category] - La categoría del producto (opcional).
 * @param {Discount[]} props.allDiscounts - Lista de todos los descuentos activos.
 * @param {StoreConfig} props.storeConfig - La configuración de la tienda.
 * @param {Brand[]} props.allBrands - Lista de todas las marcas.
 * @returns {JSX.Element} El componente de detalles del producto.
 */
export default function ProductDetailsClient({
  product,
  category,
  allDiscounts,
  storeConfig,
  allBrands,
}: { product: Product, category?: Category, allDiscounts: Discount[], storeConfig: StoreConfig, allBrands: Brand[] }) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, isFavoritesLoading } = useFavorites();
  const { user, syncUser } = useAuth();
  const { resolvedTheme } = useTheme();
  
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(product.image);
  const [reviews, setReviews] = useState<Review[]>(product.reviews);
  
  const brand = useMemo(() => {
    if (!product.brandId || !allBrands) return null;
    return allBrands.find(b => b.id === product.brandId);
  }, [product.brandId, allBrands]);

  const [customization, setCustomization] = useState<Customization>({
    size: undefined,
    patches: false,
    nameAndNumber: false,
    notes: '',
  });

  // Efecto para registrar la vista de un producto por un usuario logueado.
  useEffect(() => {
    // Solo se ejecuta si hay un usuario y el producto actual no es el último visto.
    // Esto evita un bucle infinito causado por la actualización del objeto de usuario.
    if (user && product && user.recentlyViewed?.[0] !== product.id) {
      const logView = async () => {
        const result = await addRecentlyViewedProductAction(user.id, product.id);
        if (result.success && result.user) {
          syncUser(result.user);
        }
      };
      logView();
    }
  }, [user, product, syncUser]);

  // Calcula el precio con descuento para el producto.
  const discountInfo = useMemo(() => calculateDiscountedPrice(product, allDiscounts), [product, allDiscounts]);
  const basePrice = useMemo(() => discountInfo?.finalPrice ?? product.price, [discountInfo, product.price]);
  
  const { patches: allowPatches, nameAndNumber: allowNameAndNumber } = product.customizationOptions || {};
  const showCustomizationSection = allowPatches || allowNameAndNumber;
  const hasSizeOption = product.sizes && product.sizes.length > 0;

  const currentPrice = useMemo(() => {
    let total = basePrice;
    if (customization.patches) total += PATCH_PRICE;
    if (customization.nameAndNumber) total += NAME_NUMBER_PRICE;
    return total;
  }, [basePrice, customization]);
  
  const isAddToCartDisabled = useMemo(() => {
      if (hasSizeOption && !customization.size) return true;
      if ((customization.patches || customization.nameAndNumber) && (!customization.notes || customization.notes.trim() === '')) return true;
      return false;
  }, [hasSizeOption, customization]);


  /**
   * Maneja la adición del producto al carrito de compras.
   * Valida que se haya seleccionado una talla si es necesario.
   */
  const handleAddToCart = () => {
    if (isAddToCartDisabled) {
      toast({ title: "Completa las opciones", description: "Por favor, elige una talla y/o añade notas de personalización para continuar.", variant: "destructive" });
      return;
    }
    
    addToCart(product, quantity, customization);
  };
  
  // Calcula la valoración media del producto.
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  }, [reviews]);
  
  // Formulario para añadir una nueva reseña.
  const reviewForm = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { author: "", rating: 0, text: "" },
  });

  // Rellena el nombre del autor si el usuario está logueado.
  useEffect(() => {
    if (user) {
      reviewForm.reset({ author: user.name, rating: 0, text: "" });
    } else {
      reviewForm.reset({ author: "", rating: 0, text: "" });
    }
  }, [user, reviewForm]);
  
  /**
   * Maneja el envío del formulario de reseña.
   * @param {z.infer<typeof reviewSchema>} values - Los valores del formulario.
   */
  const onSubmitReview = async (values: z.infer<typeof reviewSchema>) => {
    if (!user) {
      toast({ title: "Debes iniciar sesión", description: "Inicia sesión para poder dejar una reseña.", variant: "destructive" });
      return;
    }
    const result = await addReviewAction(product.id, user.id, values);
    if (result.success && result.review) {
      setReviews(prevReviews => [result.review!, ...prevReviews]);
      reviewForm.reset({ author: user.name, rating: 0, text: "" });
      toast({ title: "Reseña enviada", description: "Gracias por tu opinión." });
    } else {
      toast({ title: "Error", description: result.message || "No se pudo enviar la reseña.", variant: "destructive" });
    }
  };

  const isActuallyFavorite = !isFavoritesLoading && isFavorite(product.id);

  // Construye la URL completa del producto para compartir.
  const productUrl = useMemo(() => {
    const cleanBaseUrl = storeConfig.baseUrl.endsWith('/')
      ? storeConfig.baseUrl.slice(0, -1)
      : storeConfig.baseUrl;
    return `${cleanBaseUrl}/product/${product.id}`;
  }, [storeConfig.baseUrl, product.id]);

  /**
   * Copia el enlace del producto al portapapeles.
   */
  const handleCopyLink = () => {
      navigator.clipboard.writeText(productUrl);
      toast({
        title: "Enlace Copiado",
        description: "El enlace del producto ha sido copiado a tu portapapeles.",
      });
  };

  const shareText = `¡Mira este producto increíble en ${storeConfig.name}! ${product.name}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`;
  const linkedinShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(productUrl)}&title=${encodeURIComponent(product.name)}&summary=${encodeURIComponent(product.description)}`;
  const emailShareUrl = `mailto:?subject=Mira este producto: ${encodeURIComponent(product.name)}&body=${encodeURIComponent(`Hola,\n\nCreo que te podría interesar este producto que encontré en ${storeConfig.name}:\n\n${product.name}\n${productUrl}\n\n¡Échale un vistazo!`)}`;


  const isOutOfStock = product.saleType === 'stock' && product.stock === 0;

  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
      <div>
        <div className="aspect-[4/5] rounded-lg overflow-hidden border mb-4 shadow-sm relative bg-secondary/50">
            <Image
                src={mainImage}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="w-full h-full object-contain p-4"
            />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[product.image, ...(product.images || [])].filter(Boolean).map((img, index) => (
            <button
              key={index}
              onClick={() => setMainImage(img)}
              className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${mainImage === img ? 'border-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <Image src={img} alt={`${product.name} thumbnail ${index + 1}`} width={150} height={150} className="object-contain w-full h-full bg-secondary/50 p-1" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2">
            {brand && (
              <Badge variant="outline">{brand.name}</Badge>
            )}
            {category && <Badge variant="secondary">{category.name}</Badge>}
            {discountInfo && <Badge variant="destructive">OFERTA</Badge>}
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold mt-2">{product.name}</h1>
          <div className="flex items-center gap-2 mt-3">
            {averageRating && (
              <>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-primary fill-primary' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-muted-foreground text-sm">({reviews.length} reseñas)</span>
              </>
            )}
          </div>
        </div>
        
        <p className="text-base leading-relaxed text-muted-foreground">{product.longDescription}</p>

        {/* Customization Options */}
        <div className="space-y-6">
          {hasSizeOption && (
            <div>
              <Label className="text-base font-semibold">Talla</Label>
              <RadioGroup
                value={customization.size}
                onValueChange={(size) => setCustomization(c => ({...c, size}))}
                className="flex flex-wrap gap-2 mt-2"
              >
                {product.sizes?.map(size => (
                  <Label
                    key={size}
                    htmlFor={`size-${size}`}
                    className={cn(
                      "border rounded-md transition-colors cursor-pointer text-sm font-medium px-4 py-2 hover:bg-accent",
                      customization.size === size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent"
                    )}
                  >
                    <RadioGroupItem value={size} id={`size-${size}`} className="sr-only" />
                    {size}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {showCustomizationSection && (
            <div className="space-y-4">
              <Separator />
                {allowPatches && (
                    <div className="flex items-center justify-between">
                        <Label htmlFor="patches-switch" className="flex flex-col space-y-0.5">
                            <span className="font-medium">Añadir Parches</span>
                            <span className="text-xs text-muted-foreground">Incluye parches de la liga y competición. (+${PATCH_PRICE.toFixed(2)})</span>
                        </Label>
                        <Switch id="patches-switch" checked={customization.patches} onCheckedChange={(checked) => setCustomization(c => ({...c, patches: checked}))}/>
                    </div>
                )}
                {allowNameAndNumber && (
                    <div className="flex items-center justify-between">
                        <Label htmlFor="name-switch" className="flex flex-col space-y-0.5">
                            <span className="font-medium">Añadir Nombre y Dorsal</span>
                            <span className="text-xs text-muted-foreground">Personaliza con tu nombre y número. (+${NAME_NUMBER_PRICE.toFixed(2)})</span>
                        </Label>
                        <Switch id="name-switch" checked={customization.nameAndNumber} onCheckedChange={(checked) => setCustomization(c => ({...c, nameAndNumber: checked}))}/>
                    </div>
                )}
               {(customization.patches || customization.nameAndNumber) && (
                <div>
                   <Label htmlFor="custom-notes" className="font-medium">Notas de Personalización (requerido)</Label>
                   <Textarea
                     id="custom-notes"
                     value={customization.notes}
                     onChange={(e) => setCustomization(c => ({...c, notes: e.target.value}))}
                     placeholder={
                       customization.patches && !customization.nameAndNumber ? 'Ej: Parche de la Champions League' :
                       !customization.patches && customization.nameAndNumber ? 'Ej: RONALDO / 7' :
                       'Ej: Parche Champions League, Nombre: RONALDO, Dorsal: 7'
                     }
                     className="mt-1"
                     required
                   />
                </div>
              )}
              <Separator />
            </div>
          )}
        </div>
        
        <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold">${currentPrice.toFixed(2)}</span>
            {discountInfo && (
                <span className="text-2xl font-normal text-muted-foreground line-through">${product.price.toFixed(2)}</span>
            )}
            {product.saleType === 'stock' ? (
                <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                    {product.stock > 0 ? `En Stock (${product.stock})` : 'Agotado'}
                </Badge>
            ) : (
                <Badge variant="secondary">Bajo Pedido</Badge>
            )}
        </div>
        
        <Card className="bg-secondary/50 border-dashed">
            <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                    {isOutOfStock ? (
                        <Button size="lg" className="w-full" disabled>
                            <Bell className="mr-2 h-5 w-5" />
                            Próximamente disponible
                        </Button>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4">
                            <div className="flex items-center border rounded-md bg-background">
                                <Button variant="ghost" size="icon" className="h-12" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-12 text-center font-bold">{quantity}</span>
                                <Button variant="ghost" size="icon" className="h-12" onClick={() => setQuantity(q => product.saleType === 'stock' ? Math.min(product.stock, q + 1) : q + 1)}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button size="lg" className="w-full shadow-lg hover:shadow-primary/30" onClick={handleAddToCart} disabled={isAddToCartDisabled}>
                                <ShoppingCart className="mr-2 h-5 w-5" /> Añadir al Carrito
                            </Button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button size="lg" variant="outline" className="w-full" onClick={() => toggleFavorite(product.id, product.name)} disabled={isFavoritesLoading}>
                            <Heart className={cn("mr-2 h-5 w-5 transition-all", isActuallyFavorite ? "text-red-500 fill-red-500" : "text-foreground")} />
                            <span>{isActuallyFavorite ? 'En Favoritos' : 'Favorito'}</span>
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="lg" variant="outline" className="w-full">
                                    <Share2 className="mr-2 h-5 w-5" />
                                    <span>Compartir</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Compartir Producto</DialogTitle>
                                    <DialogDescription>
                                        Cualquiera con un smartphone puede escanear este código.
                                    </DialogDescription>
                                </DialogHeader>
                                 <div className="space-y-4 py-4">
                                    <div className="p-6 bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center">
                                        <div className="p-4 bg-white rounded-lg shadow-md">
                                            <QRCodeCanvas
                                                value={productUrl}
                                                size={256}
                                                bgColor={"#ffffff"}
                                                fgColor={"#000000"}
                                                level={"H"}
                                                includeMargin={true}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-4 font-semibold">Escanea para compartir</p>
                                    </div>
                                     <div className="flex w-full items-center space-x-2">
                                        <Input value={productUrl} readOnly className="flex-1" />
                                        <Button type="button" size="icon" onClick={handleCopyLink}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Separator className="my-4" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button asChild variant="outline">
                                            <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer"><FaFacebookF className="mr-2"/>Facebook</a>
                                        </Button>
                                        <Button asChild variant="outline">
                                            <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer"><FaXTwitter className="mr-2"/>Twitter</a>
                                        </Button>
                                        <Button asChild variant="outline">
                                            <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer"><FaWhatsapp className="mr-2"/>WhatsApp</a>
                                        </Button>
                                        <Button variant="outline" onClick={handleCopyLink}>
                                            <FaInstagram className="mr-2" />
                                            <span>Instagram</span>
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Separator />
        
        <Card>
          <CardHeader>
            <CardTitle>Especificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {Object.entries(product.specifications || {}).map(([key, value]) => (
                 <li key={key} className="flex justify-between items-center py-3">
                   <span className="text-muted-foreground">{key}</span>
                   <span className="font-medium text-right">{value}</span>
                 </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader>
            <CardTitle>Reseñas de Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {reviews.length > 0 ? reviews.map(review => (
              <div key={review.id} className="flex gap-4">
                <Avatar>
                  <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{review.author}</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-primary fill-primary' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(review.date), 'dd/MM/yyyy')}</p>
                  <p className="mt-2 text-sm leading-relaxed">{review.text}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aún no hay reseñas para este producto.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escribe una reseña</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <Form {...reviewForm}>
                <form onSubmit={reviewForm.handleSubmit(onSubmitReview)} className="space-y-4">
                  <FormField
                    control={reviewForm.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calificación</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-6 h-6 cursor-pointer transition-colors ${field.value >= star ? 'text-primary fill-primary' : 'text-gray-300 hover:text-gray-400'}`}
                                onClick={() => field.onChange(star)}
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={reviewForm.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tu Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Juan Pérez" {...field} readOnly disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={reviewForm.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tu Reseña</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Cuéntanos qué te pareció el producto..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Enviar Reseña</Button>
                </form>
              </Form>
            ) : (
              <div className="text-center py-8 flex flex-col items-center gap-4 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">Debes iniciar sesión para poder dejar una reseña.</p>
                <Button asChild>
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
