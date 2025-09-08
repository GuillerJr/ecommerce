
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Lightbulb, LogIn, Send, ArrowLeft } from 'lucide-react';
import { addSuggestionAction } from '@/lib/actions';

const formSchema = z.object({
  suggestion: z.string().min(10, { message: "Tu sugerencia debe tener al menos 10 caracteres." }),
});

export default function SugerenciasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            suggestion: "",
        },
    });

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login?from=/sugerencias');
        }
    }, [user, loading, router]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        const result = await addSuggestionAction(values.suggestion, user.id, user.name);
        if (result.success) {
            toast({
                title: "¡Gracias por tu sugerencia!",
                description: "Hemos recibido tu idea y la tendremos en cuenta.",
            });
            form.reset();
        } else {
            toast({
                title: "Error",
                description: result.message || "No se pudo enviar tu sugerencia.",
                variant: "destructive"
            });
        }
    };
    
    if (loading || !user) {
        return <div className="flex h-screen items-center justify-center">Cargando...</div>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-6 w-6 text-primary"/>
                            Envíanos tus Sugerencias
                        </CardTitle>
                        <CardDescription>
                            ¿Tienes una idea para mejorar la tienda o un producto que te gustaría ver? ¡Nos encantaría saberlo!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="suggestion"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tu idea, sugerencia o producto deseado</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Ej: Me gustaría que vendieran balones de básquetbol de la marca..."
                                                    rows={5}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Enviado por: <strong>{user.name}</strong></p>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        <Send className="mr-2 h-4 w-4"/>
                                        {form.formState.isSubmitting ? "Enviando..." : "Enviar Sugerencia"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
                 <div className="mt-8 flex justify-center">
                    <Button asChild variant="outline">
                        <Link href="/perfil">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Perfil
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

