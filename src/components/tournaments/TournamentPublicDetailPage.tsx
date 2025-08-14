

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { TournamentWithDetails, TournamentTeam, Match, TournamentPlayer, User, MatchEvent, Standing } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { registerTeamAction, getTournamentDetailsAction } from '@/lib/actions/tournaments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2, Calendar, AlertCircle, ChevronLeft, ChevronRight, Trophy, Goal, Footprints, RectangleVertical, Shield, Swords, Users, UserPlus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const playerSchema = z.object({
  name: z.string().min(3, "Nombre muy corto."),
  dorsal: z.coerce.number().min(1, "Dorsal inválido.").max(99, "Dorsal inválido."),
  position: z.enum(['Portero', 'Defensa', 'Mediocentro', 'Delantero']),
});

const teamSchema = z.object({
  name: z.string().min(3, "El nombre del equipo es muy corto."),
  players: z.array(playerSchema)
    .superRefine((players, ctx) => {
        if (players.length < 2) return;

        const nameOccurrences = new Map<string, number[]>();
        const dorsalOccurrences = new Map<number, number[]>();

        players.forEach((player, index) => {
            if (player.name) {
                const lowerCaseName = player.name.trim().toLowerCase();
                if (lowerCaseName) {
                    if (!nameOccurrences.has(lowerCaseName)) {
                        nameOccurrences.set(lowerCaseName, []);
                    }
                    nameOccurrences.get(lowerCaseName)!.push(index);
                }
            }
            if (player.dorsal) {
                if (!dorsalOccurrences.has(player.dorsal)) {
                    dorsalOccurrences.set(player.dorsal, []);
                }
                dorsalOccurrences.get(player.dorsal)!.push(index);
            }
        });

        nameOccurrences.forEach((indices) => {
            if (indices.length > 1) {
                indices.forEach(index => {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Nombre de jugador repetido.",
                        path: [index, 'name'],
                    });
                });
            }
        });

        dorsalOccurrences.forEach((indices) => {
            if (indices.length > 1) {
                indices.forEach(index => {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Dorsal repetido.",
                        path: [index, 'dorsal'],
                    });
                });
            }
        });
    })
}).refine(data => {
    if (data.players.length < 2) return true;
    const dorsals = data.players.map(p => p.dorsal);
    const uniqueDorsals = new Set(dorsals);
    return uniqueDorsals.size === dorsals.length;
}, {
    message: "Los dorsales de los jugadores no pueden repetirse.",
    path: ["players"],
});

type TeamFormValues = z.infer<typeof teamSchema>;

interface TournamentPublicDetailPageProps {
  initialTournament: TournamentWithDetails;
  allUsers: User[];
}

const roundOrder = ['Ronda 1', 'Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'];
const getRoundSortKey = (roundName: string): number => {
    const index = roundOrder.findIndex(r => roundName.startsWith(r));
    if (index !== -1) return index;
    if (roundName.startsWith('Jornada')) {
        const num = parseInt(roundName.split(' ').pop() || '0');
        if (!isNaN(num)) return -100 + num; // Ensure group stages are first
    }
    return 99; // Fallback
};

const EventIcon = ({ type }: { type: MatchEvent['type'] }) => {
    switch (type) {
        case 'goal': return <Goal className="h-4 w-4 text-green-500" />;
        case 'assist': return <Footprints className="h-4 w-4 text-blue-500" />;
        case 'yellow_card': return <RectangleVertical className="h-5 w-5 text-yellow-400 fill-current" />;
        case 'red_card': return <RectangleVertical className="h-5 w-5 text-red-500 fill-current" />;
        default: return null;
    }
}


export default function TournamentPublicDetailPage({ initialTournament, allUsers }: TournamentPublicDetailPageProps) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState(initialTournament);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: "", players: [] }
  });

  const { fields, append, remove } = useFieldArray({
    control: teamForm.control,
    name: "players"
  });

  const onRegisterSubmit = async (values: TeamFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    const result = await registerTeamAction({ ...values, tournamentId: tournament.id, userId: user.id });
    if (result.success) {
      toast({ title: "¡Equipo Registrado!", description: "Tu equipo está pendiente de aprobación por un administrador." });
      const updatedDetails = await getTournamentDetailsAction(tournament.id);
      if (updatedDetails.success && updatedDetails.details) {
        setTournament(updatedDetails.details);
      }
      setIsRegisterOpen(false);
    } else {
      toast({ title: "Error en el registro", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const userTeam = useMemo(() => {
    if (!user) return null;
    return tournament.teams.find(team => team.userId === user.id);
  }, [user, tournament.teams]);

  const isTournamentFull = useMemo(() => {
    return tournament.teams.length >= tournament.numberOfTeams;
  }, [tournament.teams, tournament.numberOfTeams]);

  const canRegister = useMemo(() => {
    return tournament.status === 'Abierto' && user && !userTeam && !isTournamentFull;
  }, [tournament.status, user, userTeam, isTournamentFull]);

  const getTeamName = (teamId?: string | null) => {
    if (!teamId) return 'Por definir';
    return tournament.teams.find(t => t.id === teamId)?.name || 'Equipo Desconocido';
  }
  
  const allPlayers = useMemo(() => tournament.teams.flatMap(t => t.players), [tournament.teams]);
  const playerMap = useMemo(() => new Map(allPlayers.map(p => [p.id, p])), [allPlayers]);

  const playerStats = useMemo(() => {
    const stats: Record<string, { goals: number, assists: number, yellowCards: number, redCards: number }> = {};
    (tournament.events || []).forEach(event => {
        if (!stats[event.playerId]) {
            stats[event.playerId] = { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
        }
        if (event.type === 'goal') stats[event.playerId].goals++;
        if (event.type === 'assist') stats[event.playerId].assists++;
        if (event.type === 'yellow_card') stats[event.playerId].yellowCards++;
        if (event.type === 'red_card') stats[event.playerId].redCards++;
    });
    return stats;
  }, [tournament.events]);
  
  const topScorers = useMemo(() => {
      return Object.entries(playerStats)
          .map(([playerId, stats]) => ({ player: playerMap.get(playerId), goals: stats.goals }))
          .filter(item => item.player && item.goals > 0)
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 10);
  }, [playerStats, playerMap]);

  const topAssists = useMemo(() => {
      return Object.entries(playerStats)
          .map(([playerId, stats]) => ({ player: playerMap.get(playerId), assists: stats.assists }))
          .filter(item => item.player && item.assists > 0)
          .sort((a, b) => b.assists - a.assists)
          .slice(0, 10);
  }, [playerStats, playerMap]);

  const topYellowCards = useMemo(() => {
    return Object.entries(playerStats)
        .map(([playerId, stats]) => ({ player: playerMap.get(playerId), count: stats.yellowCards }))
        .filter(item => item.player && item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
  }, [playerStats, playerMap]);

  const topRedCards = useMemo(() => {
    return Object.entries(playerStats)
        .map(([playerId, stats]) => ({ player: playerMap.get(playerId), count: stats.redCards }))
        .filter(item => item.player && item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
  }, [playerStats, playerMap]);


  // Group standings by group name for 'groups' format
  const groupStandings = useMemo(() => {
    if (tournament.format !== 'groups' || !tournament.standings) return null;
    const groups: Record<string, Standing[]> = {};
    tournament.standings.forEach(s => {
      const groupName = s.groupName || 'Sin Grupo';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(s);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tournament.format, tournament.standings]);

  // Determine if group stage is finished
  const isGroupStageFinished = useMemo(() => {
      if (tournament.format !== 'groups') return false;
      const groupStageMatches = tournament.matches.filter(m => m.round.startsWith('Jornada'));
      if (groupStageMatches.length === 0) return false;
      return groupStageMatches.every(m => m.status === 'Finalizado');
  }, [tournament.matches, tournament.format]);

  const knockoutMatches = useMemo(() => {
      if (tournament.format === 'groups') {
          return tournament.matches.filter(m => !m.round.startsWith('Jornada'));
      }
      return tournament.matches;
  }, [tournament.matches, tournament.format]);

  // Bracket visualization
  const bracketRounds = useMemo(() => {
      if (tournament.format === 'league' || knockoutMatches.length === 0) return null;
      const rounds: Record<string, Match[]> = {};
      knockoutMatches.forEach(m => {
          if (!rounds[m.round]) {
              rounds[m.round] = [];
          }
          rounds[m.round].push(m);
      });
      return Object.entries(rounds).sort((a, b) => getRoundSortKey(a[0]) - getRoundSortKey(b[0]));
  }, [knockoutMatches, tournament.format]);
  
  const championTeam = useMemo(() => {
    if (tournament.status !== 'Finalizado' || !tournament.championId) return null;
    return tournament.teams.find(t => t.id === tournament.championId);
  }, [tournament.status, tournament.championId, tournament.teams]);

  const allRounds = useMemo(() => {
    const roundNames = [...new Set(tournament.matches.map(m => m.round))];
    return roundNames.sort((a, b) => getRoundSortKey(a) - getRoundSortKey(b));
  }, [tournament.matches]);

  const matchesForCurrentRound = useMemo(() => {
    if (allRounds.length === 0) return [];
    const currentRoundName = allRounds[currentRoundIndex];
    
    if (tournament.format === 'groups' && currentRoundName.startsWith('Jornada')) {
      const jornadaNumber = currentRoundName.split(' ')[1];
      const matches = tournament.matches.filter(m => m.round.endsWith(`Jornada ${jornadaNumber}`)).sort((a, b) => a.id.localeCompare(b.id)); // Stable sort
      const groupedByGroup: Record<string, Match[]> = {};
      matches.forEach(match => {
        const groupName = match.groupName || 'Sin Grupo';
        if (!groupedByGroup[groupName]) {
          groupedByGroup[groupName] = [];
        }
        groupedByGroup[groupName].push(match);
      });
      return Object.entries(groupedByGroup).sort((a,b) => a[0].localeCompare(b[0]));
    }
    
    return tournament.matches.filter(m => m.round === currentRoundName).sort((a, b) => a.id.localeCompare(b.id)); // Stable sort
  }, [tournament.matches, allRounds, currentRoundIndex, tournament.format]);

  const formatToPathMap: Record<string, {path: string, name: string}> = {
      bracket: { path: 'eliminatoria', name: 'Eliminatoria' },
      league: { path: 'liga', name: 'Liga' },
      groups: { path: 'grupos', name: 'Grupos' }
  };

  const backLinkPath = `/torneos/${formatToPathMap[tournament.format]?.path || ''}`;
  const backLinkText = `Volver a Torneos de ${formatToPathMap[tournament.format]?.name || ''}`;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-4">
            <Button asChild variant="outline">
                <Link href={backLinkPath}>
                    <ChevronLeft className="mr-2 h-4 w-4"/>
                    {backLinkText}
                </Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <CardTitle className="font-headline text-3xl md:text-4xl">{tournament.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground">
                    <Badge>{tournament.status}</Badge>
                    <span className="capitalize">{tournament.format}</span>
                    <span>{tournament.teams.length} / {tournament.numberOfTeams} equipos</span>
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Inicia: {format(new Date(tournament.startDate), 'dd MMM, yyyy', { locale: es })}</span>
                    </div>
                    {tournament.endDate && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>Finaliza: {format(new Date(tournament.endDate), 'dd MMM, yyyy', { locale: es })}</span>
                        </div>
                    )}
                </div>
              </div>
              <div>
                {canRegister && (
                    <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg"><UserPlus className="mr-2"/>Inscribir Equipo</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Inscripción al Torneo</DialogTitle>
                                <DialogDescription>Completa los datos de tu equipo. Una vez enviado, un administrador revisará tu solicitud.</DialogDescription>
                            </DialogHeader>
                            <Form {...teamForm}>
                                <form onSubmit={teamForm.handleSubmit(onRegisterSubmit)}>
                                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-6">
                                        <FormField control={teamForm.control} name="name" render={({ field }) => (
                                            <FormItem><FormLabel>Nombre del Equipo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <Separator/>
                                        <h4 className="font-semibold text-foreground">Jugadores</h4>
                                        <div className="space-y-4">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-4 gap-2 items-end border p-2 rounded-md">
                                                     <FormField control={teamForm.control} name={`players.${index}.name`} render={({ field }) => (
                                                        <FormItem className="col-span-4 sm:col-span-2"><FormLabel>Nombre Jugador</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                                    )}/>
                                                     <FormField control={teamForm.control} name={`players.${index}.dorsal`} render={({ field }) => (
                                                        <FormItem><FormLabel>Dorsal</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )}/>
                                                     <FormField control={teamForm.control} name={`players.${index}.position`} render={({ field }) => (
                                                        <FormItem><FormLabel>Posición</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Portero">Portero</SelectItem>
                                                                    <SelectItem value="Defensa">Defensa</SelectItem>
                                                                    <SelectItem value="Mediocentro">Mediocentro</SelectItem>
                                                                    <SelectItem value="Delantero">Delantero</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        <FormMessage /></FormItem>
                                                    )}/>
                                                    <div className="col-span-4 sm:col-span-full flex justify-end">
                                                      <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                                                        <Trash2 className="mr-2 h-4 w-4"/> Quitar Jugador
                                                      </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                         <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => append({ name: '', dorsal: 1, position: 'Defensa' })}
                                            disabled={fields.length >= (tournament.rules.playersPerTeam + tournament.rules.substitutes)}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Añadir Jugador ({fields.length}/{tournament.rules.playersPerTeam + tournament.rules.substitutes})
                                        </Button>
                                        <FormField control={teamForm.control} name="players" render={({field}) => <FormMessage />} />
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>Cancelar</Button>
                                        <Button type="submit" disabled={isSubmitting}>Enviar Inscripción</Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}
                {user && userTeam && (
                    <Alert
                        variant={userTeam.status === 'Rechazado' ? 'destructive' : 'default'}
                        className={cn(
                            userTeam.status === 'Aprobado' && "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-300",
                            userTeam.status === 'Pendiente' && "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300",
                        )}
                    >
                        <AlertTitle>¡Ya estás inscrito!</AlertTitle>
                        <AlertDescription>
                           Estado de tu equipo &quot;{userTeam.name}&quot;: <span className="font-semibold">{userTeam.status}</span>
                        </AlertDescription>
                    </Alert>
                )}
              </div>
          </div>
        </CardHeader>
        <CardContent>
           {championTeam && (
                <div className="text-center p-6 my-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg border-2 border-amber-300">
                    <Trophy className="h-12 w-12 text-amber-500 mx-auto" />
                    <h3 className="text-xl font-semibold mt-2">Campeón del Torneo</h3>
                    <p className="text-3xl font-bold text-primary mt-1">{championTeam.name}</p>
                </div>
            )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Clasificación</TabsTrigger>
          <TabsTrigger value="equipos">Equipos</TabsTrigger>
          <TabsTrigger value="partidos">Partidos</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
            {tournament.format === 'league' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tabla de Posiciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10 text-center">#</TableHead>
                                    <TableHead>Equipo</TableHead>
                                    <TableHead className="text-center">Pts</TableHead>
                                    <TableHead className="text-center">PJ</TableHead>
                                    <TableHead className="hidden sm:table-cell text-center">G</TableHead>
                                    <TableHead className="hidden sm:table-cell text-center">E</TableHead>
                                    <TableHead className="hidden sm:table-cell text-center">P</TableHead>
                                    <TableHead className="hidden md:table-cell text-center">GF</TableHead>
                                    <TableHead className="hidden md:table-cell text-center">GC</TableHead>
                                    <TableHead className="text-center">DG</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {(tournament.standings || []).map((s, i) => (
                                <TableRow key={s.teamId} className={cn(i === 0 && 'bg-primary/5 hover:bg-primary/10')}>
                                    <TableCell className="text-center font-semibold">{i + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 bg-secondary"><AvatarFallback className="bg-transparent"><Shield className="h-5 w-5"/></AvatarFallback></Avatar>
                                            <span className="font-medium">{getTeamName(s.teamId)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold">{s.points}</TableCell>
                                    <TableCell className="text-center">{s.played}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-center">{s.wins}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-center">{s.draws}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-center">{s.losses}</TableCell>
                                    <TableCell className="hidden md:table-cell text-center">{s.goalsFor}</TableCell>
                                    <TableCell className="hidden md:table-cell text-center">{s.goalsAgainst}</TableCell>
                                    <TableCell className="text-center">{s.goalDifference}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
            
            {tournament.format === 'groups' && groupStandings && (
              <div className="grid lg:grid-cols-2 gap-6">
                {groupStandings.map(([groupName, standings]) => (
                    <Card key={groupName}>
                        <CardHeader>
                           <CardTitle>Grupo {groupName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                               <TableHeader><TableRow><TableHead className="w-8 text-center">#</TableHead><TableHead>Equipo</TableHead><TableHead className="text-center">Pts</TableHead><TableHead className="text-center">PJ</TableHead><TableHead className="text-center">DG</TableHead></TableRow></TableHeader>
                               <TableBody>
                               {standings.map((s, i) => (
                                   <TableRow key={s.teamId} className={cn(i < tournament.groupStageConfig!.teamsAdvancing && 'bg-primary/5 hover:bg-primary/10')}>
                                       <TableCell className="text-center font-semibold">{i + 1}</TableCell>
                                       <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 text-xs bg-secondary"><AvatarFallback className="bg-transparent"><Shield className="h-4 w-4"/></AvatarFallback></Avatar>
                                                <span className="font-medium text-sm">{getTeamName(s.teamId)}</span>
                                            </div>
                                       </TableCell>
                                       <TableCell className="text-center font-bold">{s.points}</TableCell>
                                       <TableCell className="text-center">{s.played}</TableCell>
                                       <TableCell className="text-center">{s.goalDifference}</TableCell>
                                   </TableRow>
                               ))}
                               </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}
              </div>
            )}

             {(tournament.format === 'bracket' || (tournament.format === 'groups' && isGroupStageFinished)) && bracketRounds && (
                <div className="flex gap-6 overflow-x-auto p-4 bg-muted/50 rounded-lg">
                    {bracketRounds.map(([roundName, matches]) => (
                        <div key={roundName} className="flex flex-col gap-6 flex-shrink-0 w-64">
                            <h4 className="font-bold text-center text-lg">{roundName}</h4>
                            <div className="space-y-4">
                                {matches.map((match) => {
                                    const isFinalized = match.status === 'Finalizado';
                                    const teamAIsWinner = isFinalized && match.scoreA! > match.scoreB!;
                                    const teamBIsWinner = isFinalized && match.scoreB! > match.scoreA!;
                                    return (
                                        <Card key={match.id} className="p-3 text-sm bg-background shadow-sm">
                                            <div className={cn("flex justify-between items-center", teamAIsWinner && "font-bold text-primary")}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6 text-xs bg-secondary"><AvatarFallback className="bg-transparent"><Shield className="h-4 w-4"/></AvatarFallback></Avatar>
                                                    <span className="font-medium">{getTeamName(match.teamA_Id)}</span>
                                                </div>
                                                <span className="font-bold">{match.scoreA ?? '-'}</span>
                                            </div>
                                            <Separator className="my-2"/>
                                            <div className={cn("flex justify-between items-center", teamBIsWinner && "font-bold text-primary")}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6 text-xs bg-secondary"><AvatarFallback className="bg-transparent"><Shield className="h-4 w-4"/></AvatarFallback></Avatar>
                                                    <span className="font-medium">{getTeamName(match.teamB_Id)}</span>
                                                </div>
                                                <span className="font-bold">{match.scoreB ?? '-'}</span>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </TabsContent>
        
        <TabsContent value="equipos" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tournament.teams.filter(t => t.status === 'Aprobado').map(team => (
                    <Card key={team.id}>
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                             <Avatar className="h-16 w-16 mb-2 bg-secondary">
                                <AvatarFallback className="bg-transparent">
                                    <Shield className="h-8 w-8 text-muted-foreground"/>
                                </AvatarFallback>
                            </Avatar>
                            <p className="font-semibold">{team.name}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="partidos" className="mt-4">
            {allRounds.length > 1 && (
              <div className="flex items-center justify-center gap-4 my-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentRoundIndex(i => i - 1)} disabled={currentRoundIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="font-semibold">{allRounds[currentRoundIndex]}</div>
                  <div className="text-xs text-muted-foreground">Ronda {currentRoundIndex + 1} de {allRounds.length}</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => setCurrentRoundIndex(i => i + 1)} disabled={currentRoundIndex === allRounds.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="space-y-4">
              {Array.isArray(matchesForCurrentRound) && (!matchesForCurrentRound[0] || !Array.isArray(matchesForCurrentRound[0])) ? 
                (matchesForCurrentRound as Match[]).map(match => {
                    const isFinalized = match.status === 'Finalizado';
                    const teamAIsWinner = isFinalized && match.scoreA! > match.scoreB!;
                    const teamBIsWinner = isFinalized && match.scoreB! > match.scoreA!;
                    return (
                        <Card key={match.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 w-2/5 justify-end">
                                    <span className={cn("font-semibold text-right", teamAIsWinner && "text-primary")}>{getTeamName(match.teamA_Id)}</span>
                                    <Avatar className="h-10 w-10 bg-secondary">
                                        <AvatarFallback className="bg-transparent"><Shield className="h-6 w-6 text-muted-foreground"/></AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-2xl">
                                        {isFinalized ? `${match.scoreA} - ${match.scoreB}` : 'vs'}
                                    </div>
                                    <Badge variant="outline" className="text-xs mt-1">{isFinalized ? 'Finalizado' : 'Pendiente'}</Badge>
                                </div>
                                <div className="flex items-center gap-3 w-2/5">
                                    <Avatar className="h-10 w-10 bg-secondary">
                                        <AvatarFallback className="bg-transparent"><Shield className="h-6 w-6 text-muted-foreground"/></AvatarFallback>
                                    </Avatar>
                                    <span className={cn("font-semibold", teamBIsWinner && "text-primary")}>{getTeamName(match.teamB_Id)}</span>
                                </div>
                            </div>
                        </Card>
                    )
                }) :
                (matchesForCurrentRound as [string, Match[]][]).map(([groupName, matches]) => (
                    <div key={groupName}>
                        <h4 className="font-bold text-lg mb-2">Grupo {groupName}</h4>
                        <div className="space-y-4">
                        {matches.map(match => {
                             const isFinalized = match.status === 'Finalizado';
                             const teamAIsWinner = isFinalized && match.scoreA! > match.scoreB!;
                             const teamBIsWinner = isFinalized && match.scoreB! > match.scoreA!;
                             return (
                                <Card key={match.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 w-2/5 justify-end">
                                        <span className={cn("font-semibold text-right", teamAIsWinner && "text-primary")}>{getTeamName(match.teamA_Id)}</span>
                                        <Avatar className="h-10 w-10 bg-secondary">
                                            <AvatarFallback className="bg-transparent"><Shield className="h-6 w-6 text-muted-foreground"/></AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-2xl">
                                            {isFinalized ? `${match.scoreA} - ${match.scoreB}` : 'vs'}
                                        </div>
                                        <Badge variant="outline" className="text-xs mt-1">{isFinalized ? 'Finalizado' : 'Pendiente'}</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 w-2/5">
                                        <Avatar className="h-10 w-10 bg-secondary">
                                            <AvatarFallback className="bg-transparent"><Shield className="h-6 w-6 text-muted-foreground"/></AvatarFallback>
                                        </Avatar>
                                        <span className={cn("font-semibold", teamBIsWinner && "text-primary")}>{getTeamName(match.teamB_Id)}</span>
                                    </div>
                                </div>
                                </Card>
                             )
                        })}
                        </div>
                    </div>
                ))
              }
            </div>
        </TabsContent>
        <TabsContent value="estadisticas" className="mt-4 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><Goal /> Goleadores</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Jugador</TableHead><TableHead className="text-right">Goles</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {topScorers.map(({player, goals}) => (
                                <TableRow key={player?.id}><TableCell>{player?.name}</TableCell><TableCell className="text-right">{goals}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><Footprints /> Asistencias</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Jugador</TableHead><TableHead className="text-right">Asistencias</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {topAssists.map(({player, assists}) => (
                                <TableRow key={player?.id}><TableCell>{player?.name}</TableCell><TableCell className="text-right">{assists}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><RectangleVertical className="h-5 w-5 text-yellow-400 fill-current" /> Tarjetas Amarillas</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Jugador</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {topYellowCards.map(({player, count}) => (
                                <TableRow key={player?.id}><TableCell>{player?.name}</TableCell><TableCell className="text-right">{count}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><RectangleVertical className="h-5 w-5 text-red-500 fill-current" /> Tarjetas Rojas</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Jugador</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {topRedCards.map(({player, count}) => (
                                <TableRow key={player?.id}><TableCell>{player?.name}</TableCell><TableCell className="text-right">{count}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    