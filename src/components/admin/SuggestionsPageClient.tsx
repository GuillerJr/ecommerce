
'use client';

import { useState } from "react";
import type { Suggestion } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback } from "../ui/avatar";

interface SuggestionsPageClientProps {
    initialSuggestions: Suggestion[];
}

export default function SuggestionsPageClient({ initialSuggestions }: SuggestionsPageClientProps) {
    const [suggestions] = useState(initialSuggestions);

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-secondary p-3 rounded-full border">
                    <Lightbulb className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Sugerencias de Usuarios</h1>
                    <p className="text-muted-foreground">Ideas y propuestas enviadas por la comunidad.</p>
                </div>
            </div>
            <div className="space-y-6">
                {suggestions.length > 0 ? (
                    suggestions.map(suggestion => (
                        <div key={suggestion.id} className="flex gap-4 border-b pb-6">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback>{suggestion.userName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <p className="font-semibold text-sm">{suggestion.userName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(suggestion.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                                    </p>
                                </div>
                                <p className="text-sm text-foreground">{suggestion.suggestion}</p>
                                <div className="flex items-center gap-4 pt-1">
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                                        <ThumbsUp className="h-4 w-4"/>
                                        <span>{suggestion.likes?.length || 0} Me gusta</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                                        <ThumbsDown className="h-4 w-4"/>
                                        <span>{suggestion.dislikes?.length || 0} No me gusta</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <Card>
                        <CardContent className="text-center py-16">
                            <p className="text-muted-foreground">Aún no se han recibido sugerencias.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}



    