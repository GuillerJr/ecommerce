
'use client';

import { useState, useTransition } from 'react';
import type { TournamentWithDetails, User } from '@/types';
import { updateTeamStatusAction } from '@/lib/actions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';


interface TournamentTeamsManagerProps {
  initialTournament: TournamentWithDetails;
  allUsers: User[];
}

export default function TournamentTeamsManager({ initialTournament, allUsers }: TournamentTeamsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();


  const handleUpdateTeamStatus = (teamId: string, status: 'Aprobado' | 'Rechazado') => {
    if (!user) return;
    startTransition(async () => {
      const result = await updateTeamStatusAction(teamId, status, initialTournament.id, user.id);
      if (result.success && result.team) {
        toast({ title: `Equipo ${status.toLowerCase()}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const pendingTeams = initialTournament.teams.filter(t => t.status === 'Pendiente');
  const approvedTeams = initialTournament.teams.filter(t => t.status === 'Aprobado');

  return (
    <>
      <div>
        <h4 className="font-semibold text-muted-foreground mb-2">Equipos Pendientes ({pendingTeams.length})</h4>
        {pendingTeams.length > 0 ? (
          <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                  {pendingTeams.map(team => (
                      <TableRow key={team.id}>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell className="text-right space-x-2">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleUpdateTeamStatus(team.id, 'Aprobado')} disabled={isPending}><Check className="h-4 w-4 text-green-500" /></Button>
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleUpdateTeamStatus(team.id, 'Rechazado')} disabled={isPending}><X className="h-4 w-4 text-red-500" /></Button>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground text-center py-4">No hay equipos pendientes.</p>}
      </div>
      <Separator />
      <div>
         <h4 className="font-semibold text-muted-foreground mb-2">Equipos Aprobados ({approvedTeams.length})</h4>
         {approvedTeams.length > 0 ? (
           <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                  {approvedTeams.map(team => (
                      <TableRow key={team.id}>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell className="text-right"><Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleUpdateTeamStatus(team.id, 'Rechazado')} disabled={isPending || initialTournament.status !== 'Abierto'}><X className="h-4 w-4 text-red-500" /></Button></TableCell>
                      </TableRow>
                  ))}
              </TableBody>
            </Table>
         ) : <p className="text-sm text-muted-foreground text-center py-4">No hay equipos aprobados.</p>}
      </div>
    </>
  );
}
