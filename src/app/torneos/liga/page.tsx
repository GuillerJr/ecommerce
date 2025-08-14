
/**
 * @fileoverview Página para mostrar los torneos de liga.
 */

import { getTournaments } from "@/lib/data/tournaments";
import { getUsers } from "@/lib/data/users";
import TournamentPublicListPage from "@/components/tournaments/TournamentPublicListPage";

export const dynamic = 'force-dynamic';

export default async function TorneosLigaPage() {
  const allTournaments = await getTournaments();
  const allUsers = await getUsers();
  
  const leagueTournaments = allTournaments.filter(t => t.format === 'league');

  return <TournamentPublicListPage 
    tournaments={leagueTournaments} 
    allUsers={allUsers}
    pageType="league"
  />;
}
