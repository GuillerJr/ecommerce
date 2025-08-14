/**
 * @fileoverview Página para listar torneos de liga en el panel de administración.
 */

import { getTournaments } from "@/lib/data/tournaments";
import { getUsers } from "@/lib/data/users";
import TournamentListPageClient from "@/components/admin/tournaments/TournamentListPageClient";

export const dynamic = 'force-dynamic';

export default async function AdminLeagueTournamentsPage() {
  const allTournaments = await getTournaments();
  const tournaments = allTournaments.filter(t => t.format === 'league');
  const users = await getUsers();
  
  return <TournamentListPageClient 
    initialTournaments={tournaments} 
    allUsers={users} 
    pageTitle="Torneos de Liga"
    pageDescription="Gestiona competiciones de formato todos contra todos."
    format="league"
  />;
}
