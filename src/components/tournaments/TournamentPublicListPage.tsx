

'use client';

import { useState, useMemo } from 'react';
import type { Tournament, User, TournamentWithDetails } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Trophy, Swords } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TournamentPublicListPageProps {
  tournaments: TournamentWithDetails[];
  allUsers: User[];
  pageType: 'bracket' | 'league' | 'groups';
}

export default function TournamentPublicListPage({ tournaments, allUsers, pageType }: TournamentPublicListPageProps) {
  
  const [activeTab, setActiveTab] = useState("active");

  const getChampionTeamName = (tournament: Tournament) => {
      if (!tournament.championId) return 'Por definir';
      const team = (tournament as any).teams?.find((t: any) => t.id === tournament.championId);
      return team?.name || 'Campeón';
  };

  const formatToPathMap: Record<string, string> = {
      bracket: 'eliminatoria',
      league: 'liga',
      groups: 'grupos'
  };

  const formatMap: Record<string, string> = {
      bracket: 'Eliminatoria',
      league: 'Liga',
      groups: 'Fase de Grupos'
  };
  
  const pageDetails = useMemo(() => {
    const details = {
      bracket: {
          title: "Torneos de Eliminatoria",
          description: "Competiciones de eliminación directa donde cada partido cuenta.",
          emptyState: { icon: Swords, title: "No hay torneos de eliminatoria", description: "Vuelve más tarde para ver nuevas competiciones." },
      },
      league: {
          title: "Torneos de Liga",
          description: "Compite en un formato de todos contra todos a lo largo de la temporada.",
          emptyState: { icon: Trophy, title: "No hay torneos de liga", description: "Vuelve más tarde para ver nuevas competiciones." },
      },
      groups: {
          title: "Torneos con Fase de Grupos",
          description: "Supera la fase de grupos para avanzar a las rondas de eliminación.",
          emptyState: { icon: Trophy, title: "No hay torneos de grupos", description: "Vuelve más tarde para ver nuevas competiciones." },
      },
    };
    return details[pageType];
  }, [pageType]);

  const activeTournaments = useMemo(() => tournaments.filter(t => t.status !== 'Finalizado'), [tournaments]);
  const finishedTournaments = useMemo(() => tournaments.filter(t => t.status === 'Finalizado'), [tournaments]);
  
  const renderList = (list: TournamentWithDetails[], isFinished: boolean) => {
      if (list.length === 0) {
          const statusText = isFinished ? 'finalizados' : 'activos';
          return (
             <div className="text-center py-24 border-2 border-dashed rounded-lg col-span-full">
                <pageDetails.emptyState.icon className="mx-auto h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-2xl font-semibold text-foreground">{pageDetails.emptyState.title} {statusText}</h3>
                <p className="mt-2 text-md text-muted-foreground">{pageDetails.emptyState.description}</p>
            </div>
          )
      }
      
      return (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {list.map(tournament => {
                const pathSegment = formatToPathMap[tournament.format as keyof typeof formatToPathMap] || tournament.format;
                const tournamentUrl = `/torneos/${pathSegment}/${tournament.id}`;

                if (isFinished) {
                    const championName = getChampionTeamName(tournament);
                     return (
                        <Card key={tournament.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300 bg-secondary/50">
                           <CardContent className="p-4 flex flex-col items-center justify-center text-center flex-1">
                                <Trophy className="h-12 w-12 text-amber-400 mb-2" />
                                <p className="font-semibold text-lg leading-tight line-clamp-2">{tournament.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">Campeón</p>
                                <p className="text-xl font-bold text-primary mt-1">{championName}</p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <Button asChild className="w-full" variant="outline" size="sm">
                                <Link href={tournamentUrl}>Ver Resultados</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                }

                return (
                    <Card key={tournament.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="p-4">
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle className="text-base font-bold leading-tight line-clamp-2">{tournament.name}</CardTitle>
                                <Badge variant={tournament.status === 'Abierto' ? 'default' : 'secondary'}>{tournament.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex-1 space-y-3">
                           <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4 text-primary" />
                                <span>{tournament.approvedTeamsCount ?? 0} / {tournament.numberOfTeams} equipos</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span>Inicia: {new Date(tournament.startDate).toLocaleDateString('es-EC')}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="p-2 border-t">
                            <Button asChild className="w-full" variant="secondary" size="sm">
                            <Link href={tournamentUrl}>Ver Detalles</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
          </div>
      )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-12">
        <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">{pageDetails.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            {pageDetails.description}
            </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
            <TabsTrigger value="active">En Juego</TabsTrigger>
            <TabsTrigger value="finished">Finalizados</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <section>
        {activeTab === 'active' ? renderList(activeTournaments, false) : renderList(finishedTournaments, true)}
      </section>
    </div>
  );
}
