

'use client';

import { useState, useMemo } from 'react';
import type { TournamentWithDetails, Match } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TournamentMatchesPageClientProps {
  initialTournament: TournamentWithDetails;
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

export default function TournamentMatchesPageClient({ initialTournament }: TournamentMatchesPageClientProps) {
  const [tournament] = useState(initialTournament);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  const rounds = useMemo(() => {
    const roundNames = [...new Set(tournament.matches.map(m => m.round))];
    return roundNames.sort((a, b) => getRoundSortKey(a) - getRoundSortKey(b));
  }, [tournament.matches]);
  
  const matchesForCurrentRound = useMemo(() => {
    if (rounds.length === 0) return [];
    const currentRoundName = rounds[currentRoundIndex];
    
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
    
    return tournament.matches.filter(m => m.round === rounds[currentRoundIndex]).sort((a, b) => a.id.localeCompare(b.id)); // Stable sort
  }, [tournament.matches, rounds, currentRoundIndex, tournament.format]);
    
  const getTeamName = (teamId?: string | null) => {
    if (!teamId) return 'Por definir';
    return tournament.teams.find(t => t.id === teamId)?.name || 'Equipo Desconocido';
  }

  const formatToPathMap: Record<string, string> = {
        league: 'liga',
        groups: 'grupos',
        bracket: 'eliminatoria',
  };
  const pathSegment = formatToPathMap[tournament.format] || tournament.format;
  
  const renderMatches = (matches: Match[] | [string, Match[]][]) => {
      if (Array.isArray(matches) && (!matches[0] || !Array.isArray(matches[0]))) {
         return (matches as Match[]).map(match => {
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
                   <div className="text-center mt-4">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/torneos/${pathSegment}/${tournament.id}/partido/${match.id}`}>
                          <Settings className="mr-2 h-4 w-4"/>Gestionar Partido
                        </Link>
                      </Button>
                  </div>
              </Card>
            )
        })
      }
      
      return (matches as [string, Match[]][]).map(([groupName, groupMatches]) => (
        <div key={groupName}>
            <h4 className="font-bold text-lg mb-2">Grupo {groupName}</h4>
            <div className="space-y-4">
            {groupMatches.map(match => {
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
                     <div className="text-center mt-4">
                        <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/torneos/${pathSegment}/${tournament.id}/partido/${match.id}`}>
                            <Settings className="mr-2 h-4 w-4"/>Gestionar Partido
                            </Link>
                        </Button>
                    </div>
                    </Card>
                 )
            })}
            </div>
        </div>
    ))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partidos de: {tournament.name}</CardTitle>
        <CardDescription>Aquí puedes ver y gestionar los partidos del torneo.</CardDescription>
      </CardHeader>
      <CardContent>
        {tournament.matches.length > 0 ? (
          <>
            {rounds.length > 1 && (
              <div className="flex items-center justify-center gap-4 my-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentRoundIndex(i => i - 1)} disabled={currentRoundIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="font-semibold">{rounds[currentRoundIndex]}</div>
                  <div className="text-xs text-muted-foreground">Ronda {currentRoundIndex + 1} de {rounds.length}</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => setCurrentRoundIndex(i => i + 1)} disabled={currentRoundIndex === rounds.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="space-y-4">
              {renderMatches(matchesForCurrentRound)}
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground p-8">El fixture aún no ha sido generado.</p>
        )}
      </CardContent>
    </Card>
  );
}

    