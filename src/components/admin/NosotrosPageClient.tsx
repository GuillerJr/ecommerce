

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { NosotrosPageConfig } from "@/types";
import { updateNosotrosPageConfigAction, optimizeImage as optimizeImageAction } from "@/lib/actions";
import { Info, PlusCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Icon, IconName } from "@/lib/icons";
import { useAuth } from "@/contexts/AuthContext";

const pillarSchema = z.object({
  icon: z.string().min(1, "El icono es requerido."),
  title: z.string().min(2, "El título es requerido."),
  description: z.string().min(10, "La descripción es requerida."),
});

const formSchema = z.object({
  main: z.object({
    title: z.string().min(2, "El título es requerido."),
    p1: z.string().min(10, "El párrafo 1 es requerido."),
    p2: z.string().min(10, "El párrafo 2 es requerido."),
    imageUrl: z.string().url("URL de imagen inválida.").or(z.literal("")),
  }),
  pillars: z.object({
    title: z.string().min(2, "El título de la sección es requerido."),
    description: z.string().min(10, "La descripción es requerida."),
    items: z.array(pillarSchema).min(1, "Debe haber al menos un pilar."),
  })
});

interface NosotrosPageClientProps {
  initialConfig: NosotrosPageConfig;
  icons: IconName[];
}

export default function NosotrosPageClient({ initialConfig, icons }: NosotrosPageClientProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialConfig,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pillars.items",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || user.role !== 'admin') {
      toast({ title: "No autorizado", variant: "destructive" });
      return;
    }
    const result = await updateNosotrosPageConfigAction(values, user.id);
    if (result.success) {
      toast({
        title: "Configuración Guardada",
        description: "La información de la página 'Nosotros' ha sido actualizada.",
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
          <Info className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Página &quot;Nosotros&quot;</h1>
          <p className="text-muted-foreground">Gestiona el contenido de la página de información de la empresa.</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Sección Principal</CardTitle>
              <CardDescription>La sección superior de la página con la imagen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="main.title" render={({ field }) => (
                <FormItem><FormLabel>Título Principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="main.p1" render={({ field }) => (
                <FormItem><FormLabel>Párrafo 1</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="main.p2" render={({ field }) => (
                <FormItem><FormLabel>Párrafo 2</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField
                control={form.control}
                name="main.imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen Principal</FormLabel>
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
                                  form.setValue("main.imageUrl", optimizedDataUrl, { shouldValidate: true });
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
                        <Image src={field.value} alt="Vista previa" width={200} height={112} className="h-28 w-auto object-contain rounded-md border p-1 bg-secondary"/>
                        <Button type="button" variant="destructive" size="sm" onClick={() => field.onChange('')}>Quitar Imagen</Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sección de Pilares</CardTitle>
              <CardDescription>Los valores o pilares que se muestran en la sección inferior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="pillars.title" render={({ field }) => (
                    <FormItem><FormLabel>Título de la Sección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="pillars.description" render={({ field }) => (
                    <FormItem><FormLabel>Descripción de la Sección</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <Separator/>
                <div>
                  <h3 className="text-lg font-medium mb-4">Items de Pilares</h3>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`pillars.items.${index}.title`} render={({ field }) => (
                            <FormItem><FormLabel>Título del Pilar</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name={`pillars.items.${index}.icon`} render={({ field }) => (
                            <FormItem><FormLabel>Icono</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Elige un icono" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {icons.map(iconName => (
                                    <SelectItem key={iconName} value={iconName}><div className="flex items-center gap-2"><Icon name={iconName}/><span>{iconName}</span></div></SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage /></FormItem>
                          )}/>
                        </div>
                        <FormField control={form.control} name={`pillars.items.${index}.description`} render={({ field }) => (
                            <FormItem className="mt-4"><FormLabel>Descripción del Pilar</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="button" variant="destructive" size="sm" className="mt-4" onClick={() => remove(index)}>
                          <Trash2 className="mr-2 h-4 w-4"/> Quitar Pilar
                        </Button>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ icon: 'Rocket', title: '', description: '' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Pilar
                    </Button>
                  </div>
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
