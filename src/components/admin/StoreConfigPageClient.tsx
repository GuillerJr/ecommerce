

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StoreConfig } from "@/types";
import { updateStoreConfigAction, optimizeImage as optimizeImageAction } from "@/lib/actions";
import { Percent, Store, CreditCard, FileKey } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import Image from "next/image";
import { Switch } from "../ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "../ui/separator";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' },
    { code: 'MXN', symbol: '$' },
];

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre de la tienda es requerido." }),
  legalName: z.string().min(2, { message: "La razón social es requerida." }).optional(),
  description: z.string().min(10, { message: "La descripción es muy corta." }),
  logoUrl: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
  logoUrlDark: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
  baseUrl: z.string().url({ message: "URL base inválida." }).min(1, "La URL base es requerida."),
  contactEmail: z.string().email({ message: "Correo electrónico inválido." }),
  contactPhone: z.string().min(5, { message: "Número de teléfono inválido." }),
  address: z.object({
    street: z.string().min(2, { message: "La calle es requerida."}),
    city: z.string().min(2, { message: "La ciudad es requerida."}),
    postalCode: z.string().min(2, { message: "El código postal es requerido."}),
    country: z.string().min(2, { message: "El país es requerido."}),
    ruc: z.string().length(13, { message: "El RUC debe tener 13 dígitos." }),
  }),
  currency: z.object({
    code: z.string(),
    symbol: z.string(),
  }),
  taxRate: z.coerce.number().min(0, "El IVA no puede ser negativo.").max(100, "El IVA no puede ser mayor al 100%.").optional(),
  socials: z.object({
    facebook: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
    twitter: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
    instagram: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
    linkedin: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
    whatsapp: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
    threads: z.string().url({ message: "URL inválida." }).or(z.literal('')).optional(),
  }),
  paymentGateways: z.object({
      paypal: z.object({
          enabled: z.boolean().default(false),
      }).optional(),
  }).optional(),
  eSignatureFile: z.string().optional(),
  isEInvoicingEnabled: z.boolean().default(false),
  nextInvoiceNumber: z.coerce.number().int().min(1, "El número debe ser al menos 1."),
  eInvoicingEnvironment: z.enum(['1', '2']), // 1 for Pruebas, 2 for Produccion
  contribuyenteRimpe: z.enum(["CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE", "CONTRIBUYENTE RÉGIMEN RIMPE"]).optional(),
});

interface StoreConfigPageClientProps {
    initialConfig: StoreConfig;
}

export default function StoreConfigPageClient({ initialConfig }: StoreConfigPageClientProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          ...initialConfig,
          legalName: initialConfig.legalName || initialConfig.name,
          logoUrl: initialConfig.logoUrl || '',
          logoUrlDark: initialConfig.logoUrlDark || '',
          eSignatureFile: initialConfig.eSignatureFile || '',
          isEInvoicingEnabled: initialConfig.isEInvoicingEnabled || false,
          nextInvoiceNumber: initialConfig.nextInvoiceNumber || 1,
          eInvoicingEnvironment: initialConfig.eInvoicingEnvironment || '1',
          contribuyenteRimpe: initialConfig.contribuyenteRimpe,
        },
      });

      async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user || (!user.permissions?.all && !user.permissions?.manage_store_settings)) {
          toast({ title: "No autorizado", description: "No tienes permisos para realizar esta acción.", variant: "destructive" });
          return;
        }
        const result = await updateStoreConfigAction(values, user.id);
        if (result.success) {
            toast({
                title: "Configuración Guardada",
                description: "La información de la tienda ha sido actualizada.",
            });
        } else {
            toast({
                title: "Error",
                description: result.message || "No se pudo guardar la configuración.",
                variant: "destructive"
            });
        }
      }

      return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-secondary p-3 rounded-full border">
                    <Store className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Configuración de la Tienda</h1>
                    <p className="text-muted-foreground">Gestiona la información pública y los ajustes de tu e-commerce.</p>
                </div>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identidad y Configuración Técnica</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre de la Tienda (Comercial)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="legalName" render={({ field }) => (
                                    <FormItem><FormLabel>Razón Social (Nombre Legal)</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>El nombre que aparece en el RUC y se usa para facturación.</FormDescription><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descripción Corta / Eslogan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="baseUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL Base del Sitio</FormLabel>
                                    <FormControl><Input placeholder="https://www.mitienda.com" {...field} /></FormControl>
                                    <FormDescription>Esta es la URL principal de tu tienda. Se usará para generar enlaces en correos y otras partes de la aplicación.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <Separator />
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="logoUrl"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Logotipo (Modo Claro)</FormLabel>
                                        <FormControl>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="h-auto"
                                            onClick={(e) => (e.currentTarget.value = '')}
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    const file = e.target.files[0];
                                                    const reader = new FileReader();
                                                    reader.onload = async (event) => {
                                                        if (event.target?.result) {
                                                            const dataUrl = event.target.result as string;
                                                            const optimizedDataUrl = await optimizeImageAction(dataUrl);
                                                            field.onChange(optimizedDataUrl);
                                                            form.setValue("logoUrl", optimizedDataUrl, { shouldValidate: true });
                                                        } else {
                                                            toast({ title: "Error al leer la imagen", variant: "destructive" });
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        </FormControl>
                                        {field.value && (
                                        <div className="mt-2 flex items-center gap-4">
                                            <p className="text-sm text-muted-foreground">Vista previa:</p>
                                            <Image
                                                src={field.value}
                                                alt="Vista previa del logo"
                                                width={160}
                                                height={40}
                                                className="h-10 w-auto object-contain rounded-md border p-1 bg-secondary"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => field.onChange('')}
                                            >
                                                Quitar
                                            </Button>
                                        </div>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="logoUrlDark"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Logotipo (Modo Oscuro)</FormLabel>
                                        <FormControl>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="h-auto"
                                            onClick={(e) => (e.currentTarget.value = '')}
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    const file = e.target.files[0];
                                                    const reader = new FileReader();
                                                    reader.onload = async (event) => {
                                                        if (event.target?.result) {
                                                            const dataUrl = event.target.result as string;
                                                            const optimizedDataUrl = await optimizeImageAction(dataUrl);
                                                            field.onChange(optimizedDataUrl);
                                                            form.setValue("logoUrlDark", optimizedDataUrl, { shouldValidate: true });
                                                        } else {
                                                            toast({ title: "Error al leer la imagen", variant: "destructive" });
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        </FormControl>
                                        {field.value && (
                                        <div className="mt-2 flex items-center gap-4">
                                            <p className="text-sm text-muted-foreground">Vista previa:</p>
                                            <Image
                                                src={field.value}
                                                alt="Vista previa del logo oscuro"
                                                width={160}
                                                height={40}
                                                className="h-10 w-auto object-contain rounded-md border p-1 bg-primary"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => field.onChange('')}
                                            >
                                                Quitar
                                            </Button>
                                        </div>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Contacto y Dirección</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                    <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                             </div>
                              <FormField control={form.control} name="address.ruc" render={({ field }) => (
                                <FormItem><FormLabel>RUC</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                              )}/>
                             <FormField control={form.control} name="address.street" render={({ field }) => (
                                 <FormItem><FormLabel>Calle y Número (Matriz)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                             )}/>
                             <div className="grid md:grid-cols-3 gap-6">
                                 <FormField control={form.control} name="address.city" render={({ field }) => (
                                     <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                 )}/>
                                 <FormField control={form.control} name="address.postalCode" render={({ field }) => (
                                     <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                 )}/>
                                  <FormField control={form.control} name="address.country" render={({ field }) => (
                                     <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                 )}/>
                             </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Configuración Regional y Fiscal</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                 <FormField control={form.control} name="currency.code" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Moneda</FormLabel>
                                        <Select
                                          onValueChange={(value) => {
                                            const selectedCurrency = currencies.find(c => c.code === value);
                                            if (selectedCurrency) {
                                              form.setValue('currency.code', selectedCurrency.code);
                                              form.setValue('currency.symbol', selectedCurrency.symbol);
                                            }
                                          }}
                                          defaultValue={field.value}
                                        >
                                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                          <SelectContent>
                                              {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField
                                    control={form.control}
                                    name="taxRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Porcentaje de IVA (%)</FormLabel>
                                            <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={String(field.value ?? 0)}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un IVA" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="0">0%</SelectItem>
                                                    <SelectItem value="12">12%</SelectItem>
                                                    <SelectItem value="15">15%</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Selecciona la tarifa de IVA para los cálculos de la factura.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="contribuyenteRimpe"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Régimen RIMPE</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona tu tipo de régimen..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Ninguno</SelectItem>
                                                <SelectItem value="CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE">Negocio Popular</SelectItem>
                                                <SelectItem value="CONTRIBUYENTE RÉGIMEN RIMPE">Contribuyente RIMPE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Selecciona el régimen RIMPE que aplique a tu RUC.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Configuración de Facturación Electrónica</CardTitle>
                            <CardDescription>Ajustes para la emisión de facturas electrónicas (SRI Ecuador).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="isEInvoicingEnabled" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5"><FormLabel>Activar Facturación Electrónica</FormLabel></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField
                                control={form.control}
                                name="eInvoicingEnvironment"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Ambiente SRI</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex space-x-4"
                                        >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="1" /></FormControl>
                                            <FormLabel className="font-normal">Pruebas</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="2" /></FormControl>
                                            <FormLabel className="font-normal">Producción</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="eSignatureFile"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Archivo de Firma Electrónica (.p12)</FormLabel>
                                    <FormControl>
                                        <Input
                                        type="file"
                                        accept=".p12"
                                        className="h-auto"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                            const file = e.target.files[0];
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                if (event.target?.result) {
                                                const base64String = (event.target.result as string).split(',')[1];
                                                field.onChange(base64String);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                            }
                                        }}
                                        />
                                    </FormControl>
                                    {field.value && (
                                        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                                        <FileKey className="h-4 w-4" />
                                        <span>Archivo .p12 cargado. Para cambiarlo, sube uno nuevo.</span>
                                        </div>
                                    )}
                                    <FormDescription>La contraseña se debe configurar en el archivo .env del servidor.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="nextInvoiceNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Próximo Número de Factura</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>Este número se incrementará automáticamente con cada factura.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Pasarelas de Pago</CardTitle>
                            <CardDescription>Configura los métodos de pago en línea.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-lg border p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <FormLabel htmlFor="paypal-switch" className="flex items-center gap-2 font-semibold">
                                         <CreditCard className="h-6 w-6"/>
                                        Activar Pago con Tarjeta (PayPal)
                                    </FormLabel>
                                    <FormField control={form.control} name="paymentGateways.paypal.enabled" render={({ field }) => (
                                        <FormControl><Switch id="paypal-switch" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    )} />
                                </div>
                                <FormDescription>
                                    Asegúrate de tener tus credenciales (Client ID y Client Secret) configuradas en el archivo .env de tu proyecto.
                                </FormDescription>
                            </div>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Redes Sociales</CardTitle>
                            <CardDescription>Añade las URLs completas de tus perfiles.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="socials.facebook" render={({ field }) => (
                                    <FormItem><FormLabel>Facebook</FormLabel><FormControl><Input placeholder="https://facebook.com/tupagina" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="socials.twitter" render={({ field }) => (
                                    <FormItem><FormLabel>Twitter (X)</FormLabel><FormControl><Input placeholder="https://x.com/tuusuario" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="socials.instagram" render={({ field }) => (
                                    <FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="https://instagram.com/tuusuario" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="socials.linkedin" render={({ field }) => (
                                    <FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input placeholder="https://linkedin.com/tuempresa" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="socials.whatsapp" render={({ field }) => (
                                    <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input placeholder="https://wa.me/xxxxxxxxxx" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="socials.threads" render={({ field }) => (
                                    <FormItem><FormLabel>Threads</FormLabel><FormControl><Input placeholder="https://threads.net/@tuusuario" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                             </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit">Guardar Cambios</Button>
                    </div>
                </form>
            </Form>
        </div>
      );
    }
    