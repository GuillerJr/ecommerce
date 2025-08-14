

'use client';

import { useState, useMemo } from "react";
import type { TournamentWithDetails, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trophy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { addTournamentAction } from "@/lib/actions";
import { Calendar as CalendarIcon, Swords } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/contexts/AuthContext";

const tournamentSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  format: z.enum(['bracket', 'league', 'groups'], { required_error: "Debes seleccionar un formato." }),
  numberOfTeams: z.coerce.number().min(2, "Se requieren al menos 2 equipos."),
  rules: z.object({
    playersPerTeam: z.coerce.number().min(1, "Debe haber al menos 1 jugador."),
    substitutes: z.coerce.number().min(0, "El número no puede ser negativo."),
    yellowCardsForSuspension: z.coerce.number().min(1, "Se necesita al menos 1 tarjeta para suspensión."),
  }),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  groupStageConfig: z.object({
    teamsPerGroup: z.coerce.number(),
    teamsAdvancing: z.coerce.number(),
  }).optional(),
}).refine(data => {
    if (data.format === 'groups') {
        return data.groupStageConfig && data.groupStageConfig.teamsPerGroup > 1 && data.groupStageConfig.teamsAdvancing > 0;
    }
    return true;
}, {
    message: "La configuración de grupos es inválida.",
    path: ["groupStageConfig"],
});

type TournamentFormValues = z.infer<typeof tournamentSchema>;

interface TournamentListPageClientProps {
    initialTournaments: TournamentWithDetails[];
    allUsers: User[];
    pageTitle: string;
    pageDescription: string;
    format: 'bracket' | 'league' | 'groups';
}

export default function TournamentListPageClient({ 
    initialTournaments, 
    allUsers,
    pageTitle,
    pageDescription,
    format
}: TournamentListPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("abierto");

    const form = useForm<TournamentFormValues>({
        resolver: zodResolver(tournamentSchema),
        defaultValues: {
            name: "",
            format: format,
            numberOfTeams: 16,
            startDate: new Date(),
            rules: { playersPerTeam: 11, substitutes: 5, yellowCardsForSuspension: 3 },
            groupStageConfig: { teamsPerGroup: 4, teamsAdvancing: 2 },
        }
    });
    
    const openTournaments = useMemo(() => {
        return initialTournaments.filter(t => t.status === 'Abierto');
    }, [initialTournaments]);
    
    const inProgressTournaments = useMemo(() => {
        return initialTournaments.filter(t => t.status === 'En Curso');
    }, [initialTournaments]);

    const finishedTournaments = useMemo(() => {
        return initialTournaments.filter(t => t.status === 'Finalizado');
    }, [initialTournaments]);


    const watchedFormat = form.watch("format");

    async function onSubmit(values: TournamentFormValues) {
        if (!user) return;
        const result = await addTournamentAction(values, user.id);
        if (result.success) {
            toast({ title: "Torneo Creado", description: "El nuevo torneo ha sido creado exitosamente." });
            form.reset();
            setIsCreateModalOpen(false);
            router.refresh();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    }

    const formatToPathMap: Record<string, string> = {
        league: 'liga',
        groups: 'grupos',
        bracket: 'eliminatoria',
    };
    
    const renderList = (list: TournamentWithDetails[]) => {
        if (list.length === 0) {
            return (
                <div className="text-center py-24 border-2 border-dashed rounded-lg col-span-full">
                    <Trophy className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-2xl font-semibold text-foreground">No hay torneos en este estado</h3>
                    <p className="mt-2 text-md text-muted-foreground">Vuelve más tarde o crea uno nuevo.</p>
                </div>
            )
        }
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Formato</TableHead>
                        <TableHead>Equipos</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha de Inicio</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.map((tournament) => {
                        const pathSegment = formatToPathMap[tournament.format as keyof typeof formatToPathMap] || tournament.format;
                        const tournamentUrl = `/admin/torneos/${pathSegment}/${tournament.id}`;
                        
                        return (
                            <TableRow key={tournament.id}>
                                <TableCell className="font-medium">{tournament.name}</TableCell>
                                <TableCell className="capitalize">{tournament.format}</TableCell>
                                <TableCell>{tournament.approvedTeamsCount ?? 0} / {tournament.numberOfTeams}</TableCell>
                                <TableCell><Badge>{tournament.status}</Badge></TableCell>
                                <TableCell>{new Date(tournament.startDate).toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' })}</TableCell>
                                <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                        <Link href={tournamentUrl}>Gestionar</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        )
    };

    return (
        <>
            <div className="p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-secondary p-3 rounded-full border">
                            <Trophy className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{pageTitle}</h1>
                            <p className="text-muted-foreground">{pageDescription}</p>
                        </div>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Torneo
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                         <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value="abierto">Abiertos</TabsTrigger>
                                <TabsTrigger value="en-curso">En Curso</TabsTrigger>
                                <TabsTrigger value="finalizado">Finalizados</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                         {activeTab === 'abierto' && renderList(openTournaments)}
                         {activeTab === 'en-curso' && renderList(inProgressTournaments)}
                         {activeTab === 'finalizado' && renderList(finishedTournaments)}
                    </CardContent>
                </Card>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Torneo</DialogTitle>
                        <DialogDescriptionComponent>
                            Completa los detalles para configurar tu nueva competición.
                        </DialogDescriptionComponent>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nombre del Torneo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-4">
                                 <FormField control={form.control} name="format" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Formato</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="bracket">Eliminatoria Directa</SelectItem>
                                                    <SelectItem value="league">Liga (Todos vs Todos)</SelectItem>
                                                    <SelectItem value="groups">Fase de Grupos</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                <FormField control={form.control} name="numberOfTeams" render={({ field }) => (
                                    <FormItem><FormLabel>Número de Equipos del Torneo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha de Inicio</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                    >
                                                        {field.value ? new Date(field.value).toLocaleDateString('es-EC') : <span>Elige una fecha</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {watchedFormat === 'groups' && (
                                <Card className="p-4 bg-muted/50">
                                    <h4 className="text-sm font-semibold mb-2">Configuración de Grupos</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="groupStageConfig.teamsPerGroup" render={({ field }) => (
                                            <FormItem><FormLabel>Equipos por Grupo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="groupStageConfig.teamsAdvancing" render={({ field }) => (
                                            <FormItem><FormLabel>Clasifican por Grupo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                </Card>
                            )}

                            <Card className="p-4 bg-muted/50">
                                <h4 className="text-sm font-semibold mb-2">Reglas del Torneo</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="rules.playersPerTeam" render={({ field }) => (
                                        <FormItem><FormLabel>Jugadores Titulares</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="rules.substitutes" render={({ field }) => (
                                        <FormItem><FormLabel>Suplentes</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="rules.yellowCardsForSuspension" render={({ field }) => (
                                        <FormItem><FormLabel>Amarillas para Susp.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </Card>

                            <DialogFooter>
                               <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Crear Torneo</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
