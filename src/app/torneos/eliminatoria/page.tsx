
/**
 * @fileoverview Página para mostrar los torneos de eliminatoria.
 */

import { getTournaments } from "@/lib/data/tournaments";
import { getUsers } from "@/lib/data/users";
import TournamentPublicListPage from "@/components/tournaments/TournamentPublicListPage";

export const dynamic = 'force-dynamic';

export default async function TorneosEliminatoriaPage() {
  const allTournaments = await getTournaments();
  const allUsers = await getUsers();
  
  const bracketTournaments = allTournaments.filter(t => t.format === 'bracket');

  return <TournamentPublicListPage 
    tournaments={bracketTournaments} 
    allUsers={allUsers}
    pageType="bracket"
  />;
}
