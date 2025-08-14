

'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import type { TournamentWithDetails, User, MatchEvent, PlayerSanction, Match, TournamentPlayer, TournamentTeam } from '@/types';
import { updateMatchDetailsAction, getMatchEventsAction, getPlayerSanctionsAction } from '@/lib/actions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Goal, Footprints, RectangleVertical, Trash2, AlertCircle } from 'lucide-react';
import { Form } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const eventSchema = z.object({
  type: z.enum(['goal', 'assist', 'yellow_card', 'red_card']),
  playerId: z.string().min(1, "Selecciona un jugador."),
  teamId: z.string(),
  minute: z.coerce.number().optional(),
});

const matchDetailsSchema = z.object({
  events: z.array(eventSchema),
});

type MatchDetailsFormValues = z.infer<typeof matchDetailsSchema>;

const EventIcon = ({ type }: { type: MatchEvent['type'] }) => {
    switch (type) {
        case 'goal': return <Goal className="h-4 w-4 text-green-500" />;
        case 'assist': return <Footprints className="h-4 w-4 text-blue-500" />;
        case 'yellow_card': return <RectangleVertical className="h-5 w-5 text-yellow-400 fill-current" />;
        case 'red_card': return <RectangleVertical className="h-5 w-5 text-red-500 fill-current" />;
        default: return null;
    }
}

interface MatchManagePageClientProps {
  initialMatch: Match;
  tournament: TournamentWithDetails;
}

export default function MatchManagePageClient({ initialMatch, tournament }: MatchManagePageClientProps) {
  const router = useRouter();
  const [match, setMatch] = useState(initialMatch);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sanctions, setSanctions] = useState<PlayerSanction[]>([]);

  const matchForm = useForm<MatchDetailsFormValues>({
    resolver: zodResolver(matchDetailsSchema),
    defaultValues: { events: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: matchForm.control,
    name: "events"
  });
  
  const currentEvents = matchForm.watch('events');

  const playerCardCounts = useMemo(() => {
    const counts: Record<string, { yellow: number; red: number }> = {};
    currentEvents.forEach(event => {
        if (!counts[event.playerId]) {
            counts[event.playerId] = { yellow: 0, red: 0 };
        }
        if (event.type === 'yellow_card') {
            counts[event.playerId].yellow++;
        }
        if (event.type === 'red_card') {
            counts[event.playerId].red++;
        }
    });
    return counts;
  }, [currentEvents]);


  useEffect(() => {
    getMatchEventsAction(match.id).then(res => {
        if (res.success && res.events) {
            matchForm.reset({ events: res.events as any });
        }
    });
    getPlayerSanctionsAction(tournament.id).then(res => {
        if (res.success && res.sanctions) {
            setSanctions(res.sanctions);
        }
    });
  }, [match.id, tournament.id, matchForm]);
    
  const teamA = useMemo(() => tournament.teams.find(t => t.id === match.teamA_Id) ?? null, [match, tournament.teams]);
  const teamB = useMemo(() => tournament.teams.find(t => t.id === match.teamB_Id) ?? null, [match, tournament.teams]);
  
  const suspendedPlayerIds = useMemo(() => {
      return new Set(sanctions.filter(s => s.isActive).map(s => s.playerId));
  }, [sanctions]);
    
  const getPlayerName = (playerId: string) => {
    const player = teamA?.players.find(p => p.id === playerId) || teamB?.players.find(p => p.id === playerId);
    return player?.name || 'Jugador no encontrado';
  };
  
  const formatToPathMap: Record<string, string> = {
      league: 'liga',
      groups: 'grupos',
      bracket: 'eliminatoria',
  };

  const onMatchSubmit = async (values: MatchDetailsFormValues) => {
    if (!user) return;

    startTransition(async () => {
      const result = await updateMatchDetailsAction({
        matchId: match.id,
        events: values.events,
        adminUserId: user.id
      });
        
      if (result.success && result.match) {
        setMatch(result.match);
        toast({ title: "Detalles del Partido Actualizados" });
        const pathSegment = formatToPathMap[tournament.format] || tournament.format;
        router.push(`/admin/torneos/${pathSegment}/${tournament.id}/partido`);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleAddYellowCard = (playerId: string, teamId: string) => {
    const yellowCardCount = playerCardCounts[playerId]?.yellow || 0;
    
    if (yellowCardCount >= 2) return;

    if (yellowCardCount === 1) {
        // This is the second yellow, so add a yellow and a red
        append({ type: 'yellow_card', playerId, teamId });
        append({ type: 'red_card', playerId, teamId });
    } else {
        // This is the first yellow
        append({ type: 'yellow_card', playerId, teamId });
    }
  };

  if (!teamA || !teamB) {
      return <div>Cargando equipos...</div>
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Gestionar Partido: {teamA?.name} vs {teamB?.name}</CardTitle>
            <CardDescription>Ronda: {match.round}</CardDescription>
        </CardHeader>
        <CardContent>
            <TooltipProvider>
            <Form {...matchForm}>
            <form onSubmit={matchForm.handleSubmit(onMatchSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Team A */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-center">{teamA?.name}</h3>
                        <Card className="p-2">
                            <ScrollArea className="h-96">
                                <div className="space-y-1 pr-2">
                                    {teamA?.players.map(player => {
                                        const isSuspended = suspendedPlayerIds.has(player.id);
                                        const cards = playerCardCounts[player.id] || { yellow: 0, red: 0 };
                                        const hasRedCard = cards.red > 0;
                                        const canReceiveYellow = !hasRedCard && cards.yellow < 2;
                                        const canReceiveRed = !hasRedCard;
                                        const isDisabled = isSuspended || hasRedCard;

                                        return (
                                            <div key={player.id} className={cn("flex items-center justify-between p-2 rounded-md hover:bg-muted", isDisabled && "opacity-50 bg-destructive/10")}>
                                                <span className="text-sm font-medium flex items-center gap-2">
                                                    {isSuspended && 
                                                        <Tooltip>
                                                            <TooltipTrigger><AlertCircle className="h-4 w-4 text-destructive"/></TooltipTrigger>
                                                            <TooltipContent><p>Suspendido</p></TooltipContent>
                                                        </Tooltip>
                                                    }
                                                    {player.name} ({player.dorsal})
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => append({ type: 'goal', playerId: player.id, teamId: teamA.id })} disabled={isDisabled}>
                                                      <Goal className="h-4 w-4 text-muted-foreground hover:text-green-500" title="Añadir Gol"/>
                                                    </Button>
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => append({ type: 'assist', playerId: player.id, teamId: teamA.id })} disabled={isDisabled}>
                                                        <Footprints className="h-4 w-4 text-muted-foreground hover:text-blue-500" title="Añadir Asistencia" />
                                                    </Button>
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddYellowCard(player.id, teamA.id)} disabled={!canReceiveYellow || isDisabled}>
                                                        <RectangleVertical className="h-5 w-5 text-yellow-400 fill-current" title="Añadir Tarjeta Amarilla"/>
                                                    </Button>
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => append({ type: 'red_card', playerId: player.id, teamId: teamA.id })} disabled={!canReceiveRed || isDisabled}>
                                                        <RectangleVertical className="h-5 w-5 text-red-500 fill-current" title="Añadir Tarjeta Roja"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>
                    {/* Team B */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-center">{teamB?.name}</h3>
                        <Card className="p-2">
                            <ScrollArea className="h-96">
                                <div className="space-y-1 pr-2">
                                    {teamB?.players.map(player => {
                                        const isSuspended = suspendedPlayerIds.has(player.id);
                                        const cards = playerCardCounts[player.id] || { yellow: 0, red: 0 };
                                        const hasRedCard = cards.red > 0;
                                        const canReceiveYellow = !hasRedCard && cards.yellow < 2;
                                        const canReceiveRed = !hasRedCard;
                                        const isDisabled = isSuspended || hasRedCard;

                                        return(
                                            <div key={player.id} className={cn("flex items-center justify-between p-2 rounded-md hover:bg-muted", isDisabled && "opacity-50 bg-destructive/10")}>
                                                <span className="text-sm font-medium flex items-center gap-2">
                                                     {isSuspended && 
                                                        <Tooltip>
                                                            <TooltipTrigger><AlertCircle className="h-4 w-4 text-destructive"/></TooltipTrigger>
                                                            <TooltipContent><p>Suspendido</p></TooltipContent>
                                                        </Tooltip>
                                                    }
                                                    {player.name} ({player.dorsal})
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => append({ type: 'goal', playerId: player.id, teamId: teamB.id })} disabled={isDisabled}>
                                                        <Goal className="h-4 w-4 text-muted-foreground hover:text-green-500" title="Añadir Gol"/>
                                                    </Button>
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => append({ type: 'assist', playerId: player.id, teamId: teamB.id })} disabled={isDisabled}>
                                                        <Footprints className="h-4 w-4 text-muted-foreground hover:text-blue-500" title="Añadir Asistencia" />
                                                    </Button>
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddYellowCard(player.id, teamB.id)} disabled={!canReceiveYellow || isDisabled}>
                                                        <RectangleVertical className="h-5 w-5 text-yellow-400 fill-current" title="Añadir Tarjeta Amarilla"/>
                                                    </Button>
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => append({ type: 'red_card', playerId: player.id, teamId: teamB.id })} disabled={!canReceiveRed || isDisabled}>
                                                        <RectangleVertical className="h-5 w-5 text-red-500 fill-current" title="Añadir Tarjeta Roja"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>
                        {/* Registered Events */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-center">Eventos Registrados</h3>
                        <Card className="p-2">
                            <ScrollArea className="h-96">
                                <div className="space-y-2 pr-2">
                                    {fields.length > 0 ? fields.map((field, index) => (
                                        <div key={field.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                                            <div className="flex items-center gap-2">
                                                <EventIcon type={field.type as MatchEvent['type']} />
                                                <span>{getPlayerName(field.playerId)}</span>
                                            </div>
                                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )) : (
                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                        No hay eventos registrados.
                                    </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar y Actualizar Marcador
                    </Button>
                </div>
            </form>
        </Form>
        </TooltipProvider>
        </CardContent>
    </Card>
  );
}
