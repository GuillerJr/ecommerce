

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useEffect } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product, Category, Subcategory, Brand, User } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { addProductAction, updateProductAction, optimizeImage as optimizeImageAction } from "@/lib/actions";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSwappingStrategy } from '@dnd-kit/sortable';
import { useAuth } from "@/contexts/AuthContext";
import { CSS } from '@dnd-kit/utilities';


function SortableImage({ id, src, onRemove }: { id: string; src: string; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'none',
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square bg-secondary/50 rounded-md"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing w-full h-full">
        <Image
          src={src}
          alt={`Vista previa`}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="rounded-md object-contain pointer-events-none p-1"
        />
      </div>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-20"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Eliminar imagen</span>
      </Button>
    </div>
  );
}


const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  description: z.string().min(10, { message: "La descripción corta debe tener al menos 10 caracteres." }),
  longDescription: z.string().min(20, { message: "La descripción larga debe tener al menos 20 caracteres." }),
  price: z.coerce.number().min(0.01, { message: "El precio debe ser mayor que cero." }),
  saleType: z.enum(['stock', 'on_demand']),
  stock: z.coerce.number().int().min(0, { message: "El stock no puede ser negativo." }),
  subcategoryId: z.string().min(1, { message: "Debes seleccionar una subcategoría." }),
  brandId: z.string().optional(),
  images: z.array(z.string()).min(1, { message: "Debes subir al menos una imagen." }),
  sizes: z.string().optional(),
  customizationOptions: z.object({
      patches: z.boolean().default(false),
      nameAndNumber: z.boolean().default(false),
  }).default({ patches: false, nameAndNumber: false }),
  specifications: z.string().optional(),
});

type ProductFormProps = {
  product: Product | null;
  onFormSubmit: () => void;
  categories: Category[];
  subcategories: Subcategory[];
  allBrands: Brand[];
};

export default function ProductForm({ product, onFormSubmit, categories, subcategories, allBrands }: ProductFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const groupedSubcategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      subcategories: subcategories.filter(sub => sub.categoryId === category.id)
    })).filter(group => group.subcategories.length > 0);
  }, [categories, subcategories]);

  const getInitialValues = () => {
    if (product) {
      return {
        name: product.name || "",
        description: product.description || "",
        longDescription: product.longDescription || "",
        price: product.price || 0,
        saleType: product.saleType || "stock" as const,
        stock: product.stock || 0,
        subcategoryId: product.subcategoryId || "",
        brandId: product.brandId || "",
        images: [product.image, ...product.images].filter(Boolean),
        sizes: product.sizes?.join(', ') || "",
        customizationOptions: product.customizationOptions || { patches: false, nameAndNumber: false },
        specifications: product.specifications ? Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join('\n') : "",
      };
    }
    return {
      name: "",
      description: "",
      longDescription: "",
      price: 0,
      saleType: "stock" as const,
      stock: 0,
      subcategoryId: "",
      brandId: "",
      images: [],
      sizes: "",
      customizationOptions: { patches: false, nameAndNumber: false },
      specifications: "",
    };
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(),
  });

  const saleTypeWatcher = form.watch('saleType');
  const imagesWatcher = form.watch('images');

  useEffect(() => {
    form.reset(getInitialValues());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ title: "No autorizado", description: "Debes iniciar sesión para realizar esta acción.", variant: "destructive" });
        return;
    }
    if (!user.permissions?.all && !user.permissions?.manage_products) {
      toast({ title: "No autorizado", description: "No tienes permisos para realizar esta acción.", variant: "destructive" });
      return;
    }
    try {
        const specsString = values.specifications || "";
        const specificationsObject = specsString.split('\n')
            .filter(line => line.includes(':'))
            .reduce((acc, line) => {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();
                if (key.trim() && value) {
                    acc[key.trim()] = value;
                }
                return acc;
            }, {} as Record<string, string>);

        const productData: Product = {
            id: product?.id || uuidv4(),
            name: values.name,
            description: values.description,
            longDescription: values.longDescription,
            price: values.price,
            subcategoryId: values.subcategoryId,
            brandId: values.brandId === 'none-value' ? undefined : (values.brandId || undefined),
            saleType: values.saleType,
            image: values.images[0] || 'https://placehold.co/600x400.png',
            images: values.images.slice(1),
            seller: product?.seller || { id: 'seller-random', name: 'HackTrickStore', bio: 'Tu tienda de confianza.', avatar: 'https://placehold.co/100x100.png' },
            reviews: product?.reviews || [],
            stock: values.saleType === 'on_demand' ? 0 : values.stock,
            status: product?.status || 'Activo',
            sizes: values.sizes ? values.sizes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            customizationOptions: values.customizationOptions,
            specifications: specificationsObject,
        };
        
        const result = product ? await updateProductAction(productData, user) : await addProductAction(productData, user);
        
        if (result.success) {
            toast({
                title: product ? "Producto Actualizado" : "Producto Creado",
                description: product ? "Los cambios en el producto han sido guardados." : "El nuevo producto ha sido añadido exitosamente.",
            });
            onFormSubmit();
        } else {
            throw new Error(result.message || 'Ocurrió un error desconocido');
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado.";
        toast({ title: "Error al guardar", description: errorMessage, variant: "destructive" });
    }
  }
  
  const imageDndIds = useMemo(
    () => (imagesWatcher || []).map((_, index) => `image-dnd-id-${index}`),
    [imagesWatcher]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldImages = imagesWatcher || [];
      const oldIndex = imageDndIds.indexOf(active.id as string);
      const newIndex = imageDndIds.indexOf(over.id as string);
      if (oldIndex > -1 && newIndex > -1) {
        form.setValue('images', arrayMove(oldImages, oldIndex, newIndex));
      }
    }
  }


  return (
     <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                 <div className="flex items-center justify-between">
                    <FormLabel>Descripción Corta</FormLabel>
                </div>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="longDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción Larga</FormLabel>
                <FormControl>
                  <Textarea rows={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="subcategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una subcategoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groupedSubcategories.map(group => (
                          <SelectGroup key={group.id}>
                            <SelectLabel>{group.name}</SelectLabel>
                            {group.subcategories.map(sub => (
                              <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecciona una marca (opcional)" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="none-value">Ninguna</SelectItem>
                        {allBrands.filter(b => b.status === 'Activo').map(brand => (
                            <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormDescription>
                        Asocia este producto a una marca (opcional).
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="saleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Venta</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4 pt-2"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="stock" /></FormControl>
                            <FormLabel className="font-normal">Por Stock</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="on_demand" /></FormControl>
                            <FormLabel className="font-normal">Bajo Pedido</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {saleTypeWatcher === 'stock' && (
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Disponible</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
          <FormField
            control={form.control}
            name="sizes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tallas Disponibles</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="Ej: S, M, L, XL" />
                </FormControl>
                <FormDescription>
                  Separa las tallas por comas. Déjalo en blanco si no aplica.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

           <FormField
            control={form.control}
            name="specifications"
            render={({ field }) => (
              <FormItem>
                 <div className="flex items-center justify-between">
                    <FormLabel>Especificaciones</FormLabel>
                </div>
                <FormControl>
                  <Textarea rows={4} {...field} value={field.value ?? ''} placeholder="Clave: Valor (una por línea)"/>
                </FormControl>
                 <FormDescription>
                  Añade especificaciones, una por línea, en formato `Clave: Valor`.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Opciones de Personalización</FormLabel>
            <FormDescription className="mb-2">
                Selecciona qué opciones de personalización estarán disponibles para este producto.
            </FormDescription>
            <div className="space-y-2 rounded-lg border p-3 shadow-sm">
                <FormField
                    control={form.control}
                    name="customizationOptions.patches"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                            <FormLabel>Permitir Parches</FormLabel>
                        </div>
                        <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                    )}
                />
                <Separator />
                <FormField
                    control={form.control}
                    name="customizationOptions.nameAndNumber"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                            <FormLabel>Permitir Nombre y Dorsal</FormLabel>
                        </div>
                        <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                    )}
                />
            </div>
          </div>

          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imágenes del Producto</FormLabel>
                <FormControl>
                   <Input
                    type="file"
                    multiple
                    accept="image/*"
                    className="h-auto"
                    onClick={(e) => (e.currentTarget.value = '')} // Reset file input
                    onChange={async (e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        const currentImages = field.value || [];
                        
                        const filePromises = files.map(file => {
                            return new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                    if (event.target?.result) {
                                        const dataUrl = event.target.result as string;
                                        try {
                                          const optimizedDataUrl = await optimizeImageAction(dataUrl);
                                          resolve(optimizedDataUrl);
                                        } catch (e) {
                                          reject(e);
                                        }
                                    } else {
                                        reject(new Error("No se pudo leer el archivo."));
                                    }
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                            });
                        });

                        try {
                          const newImages = await Promise.all(filePromises);
                          const allImages = [...newImages, ...currentImages];
                          field.onChange(allImages);
                          form.setValue("images", allImages, { shouldValidate: true });
                        } catch (error) {
                          console.error("Error al procesar imágenes:", error);
                          toast({ title: "Error al subir imágenes", variant: "destructive" });
                        }
                      }
                    }}
                  />
                </FormControl>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={imageDndIds} strategy={rectSwappingStrategy}>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {(imagesWatcher || []).map((imageSrc, index) => (
                        <SortableImage
                          key={imageDndIds[index]}
                          id={imageDndIds[index]}
                          src={imageSrc}
                          onRemove={() => {
                            const newImages = (imagesWatcher || []).filter((_, i) => i !== index);
                            form.setValue('images', newImages);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <FormDescription>
                  Sube una o más imágenes. Arrástralas para reordenarlas. La primera será la imagen principal.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onFormSubmit}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Form>
  );
}
