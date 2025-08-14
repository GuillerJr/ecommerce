/**
 * @fileoverview Página para mostrar la lista de partidos de un torneo específico.
 */

import { getTournamentDetailsFromDb as getTournamentDetails } from "@/lib/data/tournaments";
import { notFound } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import TournamentMatchesPageClient from "@/components/admin/tournaments/TournamentMatchesPageClient";

export const dynamic = 'force-dynamic';

export default async function TournamentMatchesPage(
  { params }: { params: Promise<{ id: string }> } // ✅ params como Promise
) {
  const { id } = await params; // ✅ esperar antes de acceder
  const tournament = await getTournamentDetails(id);

    if (!tournament) {
      notFound();
    }
  
    const returnHref = `/admin/torneos/grupos`;

    return (
      <div className="p-4 md:p-8">
        <div className="mb-4">
          <Button asChild variant="outline">
            <Link href={returnHref}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver a Torneos de Grupos
            </Link>
          </Button>
        </div>
        <TournamentMatchesPageClient
          initialTournament={tournament}
        />
      </div>
    );
  }
  