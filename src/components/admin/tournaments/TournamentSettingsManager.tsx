

'use client';

import { useState, useTransition } from 'react';
import type { TournamentWithDetails } from '@/types';
import { generateTournamentMatchesAction } from '@/lib/actions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Swords } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TournamentSettingsManagerProps {
  initialTournament: TournamentWithDetails;
}

export default function TournamentSettingsManager({ initialTournament }: TournamentSettingsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleGenerateMatches = () => {
      if (!user) return;
      startTransition(async () => {
          const result = await generateTournamentMatchesAction(initialTournament.id, user.id);
          if (result.success) {
            toast({ title: "Fixture Generado", description: "Los partidos han sido creados." });
            router.refresh();
          } else {
              toast({ title: "Error al generar partidos", description: result.message, variant: "destructive" });
          }
      });
  }
  
  const approvedTeamsCount = initialTournament.teams.filter(t => t.status === 'Aprobado').length;

  return (
    <>
      {initialTournament.status === 'Abierto' && initialTournament.matches.length === 0 && (
          <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2"><Swords /> Generar Fixture</h4>
              <Alert>
                  <AlertTitle>Confirmación Necesaria</AlertTitle>
                  <AlertDescription>
                      Hay {approvedTeamsCount} equipos aprobados. Una vez que generes el fixture, no se podrán aprobar más equipos y el torneo pasará a estado "En Curso".
                  </AlertDescription>
              </Alert>
               <Button onClick={handleGenerateMatches} disabled={isPending || approvedTeamsCount < 2}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generar Partidos
              </Button>
          </div>
      )}
      {initialTournament.matches.length > 0 && <p className="text-sm text-muted-foreground">El fixture ya ha sido generado para este torneo.</p>}
    </>
  );
}
