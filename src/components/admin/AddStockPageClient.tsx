
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/types";
import { addStockAction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";

const addStockSchema = z.object({
  productId: z.string().min(1, "Debes seleccionar un producto."),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  notes: z.string().optional(),
});

type AddStockFormValues = z.infer<typeof addStockSchema>;

interface AddStockPageClientProps {
    allProducts: Product[];
}

export default function AddStockPageClient({ allProducts }: AddStockPageClientProps) {
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<AddStockFormValues>({
        resolver: zodResolver(addStockSchema),
        defaultValues: {
            productId: "",
            quantity: 1,
            notes: "",
        },
    });

    async function onSubmit(values: AddStockFormValues) {
        const result = await addStockAction(values.productId, values.quantity, values.notes || 'Entrada de inventario manual');
        if (result.success) {
            toast({
                title: "Stock Añadido",
                description: `Se han añadido ${values.quantity} unidades al producto seleccionado.`,
            });
            form.reset({ productId: "", quantity: 1, notes: "" });
            router.refresh();
        } else {
            toast({
                title: "Error",
                description: result.message || "No se pudo añadir el stock.",
                variant: "destructive"
            });
        }
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-secondary p-3 rounded-full border">
                    <Boxes className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Añadir Stock a Inventario</h1>
                    <p className="text-muted-foreground">Registra nuevas entradas de productos existentes.</p>
                </div>
            </div>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Formulario de Entrada</CardTitle>
                    <CardDescription>Selecciona un producto y la cantidad a añadir al stock.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="productId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Producto</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un producto..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {allProducts.map(product => (
                                                    <SelectItem key={product.id} value={product.id}>
                                                        {product.name} (Stock actual: {product.stock})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cantidad a Añadir</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notas (Opcional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Ej: Compra a proveedor XYZ, Lote #123" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full">Añadir Stock</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
