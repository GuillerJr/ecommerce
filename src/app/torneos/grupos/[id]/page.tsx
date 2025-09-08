/**
 * @fileoverview Página de detalles de un torneo específico para los usuarios.
 */

import { getTournamentDetailsFromDb as getTournamentDetails } from '@/lib/data/tournaments';
import { getUsers } from '@/lib/data/users';
import { notFound } from 'next/navigation';
import TournamentPublicDetailPage from '@/components/tournaments/TournamentPublicDetailPage';

export const dynamic = 'force-dynamic';

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const tournament = await getTournamentDetails(id);
  const users = await getUsers();

  if (!tournament) {
    notFound();
  }

  return (
    <TournamentPublicDetailPage initialTournament={tournament} allUsers={users} />
  );
}
    