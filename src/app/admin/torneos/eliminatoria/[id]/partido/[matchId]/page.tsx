/**
 * @fileoverview Página para gestionar los detalles de un partido específico.
 */
import { getMatchByIdAction, getTournamentDetailsAction } from "@/lib/actions/tournaments";
import { notFound } from "next/navigation";
import MatchManagePageClient from "@/components/admin/tournaments/MatchManagePageClient";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ManageMatchPage({ params }: { params: { id: string; matchId: string } }) {
  const { id: tournamentId, matchId } = params;

    const matchResult = await getMatchByIdAction(matchId);
    if (!matchResult.success || !matchResult.match) {
      notFound();
    }
  
    // Ensure the match belongs to the correct tournament
    if (matchResult.match.tournamentId !== tournamentId) {
      notFound();
    }

    const tournamentResult = await getTournamentDetailsAction(tournamentId);
    if (!tournamentResult.success || !tournamentResult.details) {
      notFound();
    }
  
    return (
      <div className="p-4 md:p-8">
        <div className="mb-4">
          <Button asChild variant="outline">
            <Link href={`/admin/torneos/eliminatoria/${tournamentId}/partido`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver a la Lista de Partidos
            </Link>
          </Button>
        </div>
        <MatchManagePageClient
          initialMatch={matchResult.match}
          tournament={tournamentResult.details}
        />
      </div>
    );
  }
    