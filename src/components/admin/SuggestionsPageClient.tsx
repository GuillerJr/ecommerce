
'use client';

import { useState, useMemo } from "react";
import type { Suggestion } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback } from "../ui/avatar";

interface SuggestionsPageClientProps {
    initialSuggestions: Suggestion[];
}

export default function SuggestionsPageClient({ initialSuggestions }: SuggestionsPageClientProps) {
    const [suggestions, setSuggestions] = useState(initialSuggestions);

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
            <div className="space-y-4">
                {suggestions.length > 0 ? (
                    suggestions.map(suggestion => (
                        <Card key={suggestion.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>{suggestion.userName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <CardTitle className="text-base">{suggestion.userName}</CardTitle>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(suggestion.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-base">{suggestion.suggestion}</p>
                            </CardContent>
                        </Card>
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

