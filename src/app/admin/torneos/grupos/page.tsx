/**
 * @fileoverview Página para listar torneos de grupos en el panel de administración.
 */

import { getTournaments } from "@/lib/data/tournaments";
import { getUsers } from "@/lib/data/users";
import TournamentListPageClient from "@/components/admin/tournaments/TournamentListPageClient";

export const dynamic = 'force-dynamic';

export default async function AdminGroupsTournamentsPage() {
  const allTournaments = await getTournaments();
  const tournaments = allTournaments.filter(t => t.format === 'groups');
  const users = await getUsers();
  
  return <TournamentListPageClient 
    initialTournaments={tournaments} 
    allUsers={users} 
    pageTitle="Torneos de Fase de Grupos"
    pageDescription="Gestiona competiciones con una fase de grupos inicial."
    format="groups"
  />;
}
