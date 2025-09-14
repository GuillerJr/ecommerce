
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lightbulb, Send, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { addSuggestionAction, getSuggestionsAction, voteOnSuggestionAction } from '@/lib/actions';
import type { Suggestion } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  suggestion: z.string().min(10, { message: "Tu sugerencia debe tener al menos 10 caracteres." }),
});

const SuggestionSkeleton = () => (
    <div className="space-y-8 mt-8">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-3">
                    <div className="flex justify-between">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                     <div className="pt-2 flex items-center gap-4">
                        <Skeleton className="h-8 w-16 rounded-full" />
                        <Skeleton className="h-8 w-16 rounded-full" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default function SugerenciasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

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

    const fetchSuggestions = async () => {
        setIsLoadingSuggestions(true);
        const result = await getSuggestionsAction();
        if (result.success && result.suggestions) {
            setSuggestions(result.suggestions);
        }
        setIsLoadingSuggestions(false);
    };

    useEffect(() => {
        if(user) {
            fetchSuggestions();
        }
    }, [user]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        const result = await addSuggestionAction(values.suggestion, user.id, user.name);
        if (result.success) {
            toast({
                title: "¡Gracias por tu sugerencia!",
                description: "Hemos recibido tu idea y la tendremos en cuenta.",
            });
            form.reset();
            fetchSuggestions(); // Refresh the list
        } else {
            toast({
                title: "Error",
                description: result.message || "No se pudo enviar tu sugerencia.",
                variant: "destructive"
            });
        }
    };
    
    const handleVote = async (suggestionId: string, voteType: 'like' | 'dislike') => {
        if (!user) {
            toast({ title: 'Debes iniciar sesión para votar', variant: 'destructive' });
            return;
        }

        const originalSuggestions = suggestions;

        setSuggestions(prev => prev.map(s => {
            if (s.id === suggestionId) {
                const isLiked = s.likes.includes(user.id);
                const isDisliked = s.dislikes.includes(user.id);
                const newLikes = [...s.likes];
                const newDislikes = [...s.dislikes];

                if (voteType === 'like') {
                    if (isLiked) {
                        newLikes.splice(newLikes.indexOf(user.id), 1);
                    } else {
                        newLikes.push(user.id);
                        if (isDisliked) newDislikes.splice(newDislikes.indexOf(user.id), 1);
                    }
                } else {
                    if (isDisliked) {
                        newDislikes.splice(newDislikes.indexOf(user.id), 1);
                    } else {
                        newDislikes.push(user.id);
                        if (isLiked) newLikes.splice(newLikes.indexOf(user.id), 1);
                    }
                }
                return { ...s, likes: newLikes, dislikes: newDislikes };
            }
            return s;
        }));

        const result = await voteOnSuggestionAction(suggestionId, user.id, voteType);

        if (!result.success) {
            setSuggestions(originalSuggestions);
            toast({ title: "Error al votar", description: result.message, variant: "destructive" });
        }
    };


    if (loading || !user) {
        return (
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                 <div className="max-w-2xl mx-auto">
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-5 w-1/2" />
                    <SuggestionSkeleton />
                 </div>
             </div>
        );
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
                            ¿Tienes una idea para mejorar la tienda o un producto que te gustaría ver? ¡Nos encantaría saberlo! Tus ideas y las de otros usuarios se mostrarán a continuación.
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

                 <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-4">Sugerencias de la Comunidad</h2>
                     {isLoadingSuggestions ? <SuggestionSkeleton /> :
                        <div className="space-y-6">
                            {suggestions.length > 0 ? (
                                suggestions.map(suggestion => {
                                    const userLike = suggestion.likes?.includes(user.id);
                                    const userDislike = suggestion.dislikes?.includes(user.id);
                                    return (
                                        <div key={suggestion.id} className="flex gap-4 border-b pb-6">
                                            <Avatar className="h-9 w-9">
                                                <AvatarFallback>{suggestion.userName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-baseline justify-between">
                                                    <p className="font-semibold text-sm">{suggestion.userName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(suggestion.createdAt), "dd MMM yyyy", { locale: es })}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-foreground">{suggestion.suggestion}</p>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <Button variant="ghost" size="sm" onClick={() => handleVote(suggestion.id, 'like')} className={cn("flex items-center gap-1.5 h-8 px-2 text-muted-foreground hover:text-green-600", userLike && "text-green-600")}>
                                                        <ThumbsUp className="h-4 w-4"/>
                                                        <span>{suggestion.likes?.length || 0}</span>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleVote(suggestion.id, 'dislike')} className={cn("flex items-center gap-1.5 h-8 px-2 text-muted-foreground hover:text-destructive", userDislike && "text-destructive")}>
                                                        <ThumbsDown className="h-4 w-4"/>
                                                         <span>{suggestion.dislikes?.length || 0}</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <Card>
                                    <CardContent className="text-center py-16">
                                        <p className="text-muted-foreground">Sé el primero en dejar una sugerencia.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    }
                 </div>

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



    