/**
 * @fileoverview Página para listar torneos de eliminatoria en el panel de administración.
 */

import { getTournaments } from "@/lib/data/tournaments";
import { getUsers } from "@/lib/data/users";
import TournamentListPageClient from "@/components/admin/tournaments/TournamentListPageClient";

export const dynamic = 'force-dynamic';

export default async function AdminBracketTournamentsPage() {
  const allTournaments = await getTournaments();
  const tournaments = allTournaments.filter(t => t.format === 'bracket');
  const users = await getUsers();
  
  return <TournamentListPageClient 
    initialTournaments={tournaments} 
    allUsers={users} 
    pageTitle="Torneos de Eliminatoria"
    pageDescription="Gestiona competiciones de eliminación directa."
    format="bracket"
  />;
}
