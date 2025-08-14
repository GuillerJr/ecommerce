
/**
 * @fileoverview Página para mostrar los torneos con fase de grupos.
 */

import { getTournaments } from "@/lib/data/tournaments";
import { getUsers } from "@/lib/data/users";
import TournamentPublicListPage from "@/components/tournaments/TournamentPublicListPage";

export const dynamic = 'force-dynamic';

export default async function TorneosGruposPage() {
  const allTournaments = await getTournaments();
  const allUsers = await getUsers();
  
  const groupTournaments = allTournaments.filter(t => t.format === 'groups');

  return <TournamentPublicListPage 
    tournaments={groupTournaments} 
    allUsers={allUsers}
    pageType="groups"
  />;
}
