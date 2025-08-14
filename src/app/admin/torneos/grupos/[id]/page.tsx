

/**
 * @fileoverview Página de gestión para un torneo específico en el panel de administración.
 */

import { getTournamentDetailsFromDb as getTournamentDetails } from "@/lib/data/tournaments";
import { getUsers } from "@/lib/data/users";
import { notFound } from "next/navigation";
import TournamentTeamsManager from "@/components/admin/tournaments/TournamentTeamsManager";
import TournamentSettingsManager from "@/components/admin/tournaments/TournamentSettingsManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ClipboardList, Users, Settings, Trophy, Calendar, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";


export default async function ManageTournamentPage({ params }: { params: { id: string } }) {
  const tournament = await getTournamentDetails(params.id);
  
  if (!tournament) {
    notFound();
  }
  
  const allUsers = await getUsers();
  
  return (
     <div className="p-4 md:p-8">
        <div className="mb-4">
            <Button asChild variant="outline">
                <Link href="/admin/torneos/grupos">
                    <ChevronLeft className="mr-2 h-4 w-4"/>
                    Volver a Torneos de Grupos
                </Link>
            </Button>
        </div>
        <Card>
             <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                        <Badge variant="outline" className="mb-2 capitalize">{tournament.format}</Badge>
                        <CardTitle className="font-headline text-3xl">{tournament.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">{tournament.status}</Badge>
                            <div className="flex items-center gap-1.5"><Users2 className="h-4 w-4" /><span>{tournament.approvedTeamsCount} / {tournament.numberOfTeams} equipos</span></div>
                            <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>Inicia: {format(new Date(tournament.startDate), 'dd MMM, yyyy', { locale: es })}</span></div>
                             {tournament.championId && <div className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-amber-500" /><span>Campeón: {tournament.teams.find(t => t.id === tournament.championId)?.name}</span></div>}
                        </div>
                    </div>
                     {tournament.matches.length > 0 && (
                        <Button asChild className="shrink-0">
                            <Link href={`/admin/torneos/grupos/${tournament.id}/partido`}>
                                <ClipboardList className="mr-2 h-4 w-4"/>
                                Ver/Gestionar Partidos
                            </Link>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="teams" className="mt-4">
                    <TabsList>
                        <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4"/>Equipos</TabsTrigger>
                        <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Configuración</TabsTrigger>
                    </TabsList>
                    <TabsContent value="teams" className="space-y-6 pt-4">
                      <TournamentTeamsManager initialTournament={tournament} allUsers={allUsers} />
                    </TabsContent>
                    <TabsContent value="settings" className="pt-4">
                       <TournamentSettingsManager initialTournament={tournament} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
