/**
 * @fileoverview Página para gestionar los detalles de un partido específico.
 */
import { getMatchByIdAction, getTournamentDetailsAction } from "@/lib/actions/tournaments";
import { notFound } from "next/navigation";
import MatchManagePageClient from "@/components/admin/tournaments/MatchManagePageClient";

export const dynamic = 'force-dynamic';

export default async function ManageMatchPage({ params }: { params: { id: string } }) {
  const matchId = params.id;
  
  const matchResult = await getMatchByIdAction(matchId);
  if (!matchResult.success || !matchResult.match) {
    notFound();
  }
  
  const tournamentResult = await getTournamentDetailsAction(matchResult.match.tournamentId);
  if (!tournamentResult.success || !tournamentResult.details) {
    notFound();
  }
  
  return (
    <MatchManagePageClient 
      initialMatch={matchResult.match} 
      tournament={tournamentResult.details} 
    />
  );
}
