/**
 * @fileoverview Página de detalles de un torneo específico para los usuarios.
 */

import { getTournamentDetailsFromDb as getTournamentDetails } from '@/lib/data/tournaments';
import { getUsers } from '@/lib/data/users';
import { notFound } from 'next/navigation';
import TournamentPublicDetailPage from '@/components/tournaments/TournamentPublicDetailPage';

export const dynamic = 'force-dynamic';

export default async function TournamentDetailPage(
  { params }: { params: Promise<{ id: string }> } // ✅ Declaramos como Promise
) {
  const { id } = await params; // ✅ Esperamos params antes de usarlo

  const tournament = await getTournamentDetails(id);
  const users = await getUsers();

  if (!tournament) {
    notFound();
  }

  return (
    <TournamentPublicDetailPage initialTournament={tournament} allUsers={users} />
  );
}
