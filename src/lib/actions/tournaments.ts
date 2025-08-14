

'use server';

import {
  getTournamentDetailsFromDb,
  updateTeamStatusInDb,
  generateTournamentMatchesInDb,
  addTeamToTournament,
  updateMatchScoreInDb,
  getMatchEventsFromDb,
  getPlayerSanctionsFromDb,
  getMatchByIdFromDb,
  addTournamentToDb,
} from '@/lib/data/tournaments';
import { logActivity } from '../data/activity';
import { revalidatePath } from 'next/cache';
import type { Tournament, MatchEvent, User } from '@/types';
import { getUserById } from '../data/users';

export async function addTournamentAction(
  data: Omit<Tournament, 'id' | 'status' | 'createdAt' | 'championId' | 'endDate'>,
  adminUserId: string
) {
  try {
    const newTournament = await addTournamentToDb(data);
    
    const adminUser = await getUserById(adminUserId);
    if (adminUser) {
        await logActivity({
          userId: adminUserId,
          userName: adminUser.name,
          action: 'create',
          entityType: 'Tournament',
          entityId: newTournament.id,
          details: { name: newTournament.name, format: newTournament.format, numberOfTeams: newTournament.numberOfTeams },
        });
    }

    revalidatePath('/admin/torneos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear el torneo.';
    return { success: false, message };
  }
}

export async function getTournamentDetailsAction(tournamentId: string) {
  try {
    const details = await getTournamentDetailsFromDb(tournamentId);
    if (!details) {
      return { success: false, message: 'Torneo no encontrado.' };
    }
    return { success: true, details: JSON.parse(JSON.stringify(details)) };
  } catch (error) {
    return { success: false, message: 'Error al obtener detalles del torneo.' };
  }
}

export async function updateTeamStatusAction(
  teamId: string,
  status: 'Aprobado' | 'Rechazado',
  tournamentId: string,
  adminUserId: string
) {
  try {
    const team = await updateTeamStatusInDb(teamId, status);
    const adminUser = await getUserById(adminUserId);
     if (adminUser) {
        await logActivity({
          userId: adminUserId,
          userName: adminUser.name,
          action: 'update_team_status',
          entityType: 'TournamentTeam',
          entityId: teamId,
          details: { teamName: team.name, newStatus: status, tournamentId },
        });
    }
    revalidatePath(`/admin/torneos/liga/${tournamentId}`);
    revalidatePath(`/admin/torneos/grupos/${tournamentId}`);
    revalidatePath(`/admin/torneos/eliminatoria/${tournamentId}`);
    return { success: true, team: JSON.parse(JSON.stringify(team)) };
  } catch (error) {
    return { success: false, message: 'Error al actualizar el estado del equipo.' };
  }
}

export async function generateTournamentMatchesAction(tournamentId: string, adminUserId: string) {
  try {
    await generateTournamentMatchesInDb(tournamentId);
    const adminUser = await getUserById(adminUserId);
     if (adminUser) {
        await logActivity({
            userId: adminUserId,
            userName: adminUser.name,
            action: 'generate_matches',
            entityType: 'Tournament',
            entityId: tournamentId,
        });
    }
    revalidatePath(`/admin/torneos/liga/${tournamentId}`);
    revalidatePath(`/admin/torneos/grupos/${tournamentId}`);
    revalidatePath(`/admin/torneos/eliminatoria/${tournamentId}`);
    revalidatePath(`/torneos/liga/${tournamentId}`);
    revalidatePath(`/torneos/grupos/${tournamentId}`);
    revalidatePath(`/torneos/eliminatoria/${tournamentId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al generar los partidos.';
    return { success: false, message };
  }
}

export async function registerTeamAction(data: any) {
    try {
        const team = await addTeamToTournament(data);
        revalidatePath(`/torneos/liga/${data.tournamentId}`);
        revalidatePath(`/torneos/grupos/${data.tournamentId}`);
        revalidatePath(`/torneos/eliminatoria/${data.tournamentId}`);
        return { success: true, team: JSON.parse(JSON.stringify(team)) };
    } catch(error) {
        const message = error instanceof Error ? error.message : 'Error al registrar el equipo.';
        return { success: false, message };
    }
}

export async function updateMatchDetailsAction({ matchId, events, adminUserId }: { matchId: string; events: MatchEvent[]; adminUserId: string; }) {
    try {
        const match = await updateMatchScoreInDb(matchId, events);
        const adminUser = await getUserById(adminUserId);
         if (adminUser) {
            await logActivity({
                userId: adminUserId,
                userName: adminUser.name,
                action: 'update_match_details',
                entityType: 'Match',
                entityId: matchId,
                details: { scoreA: match.scoreA, scoreB: match.scoreB, eventsCount: events.length },
            });
        }
        revalidatePath(`/admin/torneos/liga/${match.tournamentId}`);
        revalidatePath(`/admin/torneos/grupos/${match.tournamentId}`);
        revalidatePath(`/admin/torneos/eliminatoria/${match.tournamentId}`);
        revalidatePath(`/admin/torneos/partido/${match.id}`);
        revalidatePath(`/torneos/liga/${match.tournamentId}`);
        revalidatePath(`/torneos/grupos/${match.tournamentId}`);
        revalidatePath(`/torneos/eliminatoria/${match.tournamentId}`);
        return { success: true, match: JSON.parse(JSON.stringify(match)) };
    } catch(error) {
        const message = error instanceof Error ? error.message : 'Error al actualizar los detalles del partido.';
        return { success: false, message };
    }
}

export async function getMatchEventsAction(matchId: string) {
    try {
        const events = await getMatchEventsFromDb(matchId);
        return { success: true, events: JSON.parse(JSON.stringify(events)) };
    } catch(error) {
        return { success: false, message: 'Error al obtener los eventos del partido.' };
    }
}

export async function getPlayerSanctionsAction(tournamentId: string) {
    try {
        const sanctions = await getPlayerSanctionsFromDb(tournamentId);
        return { success: true, sanctions: JSON.parse(JSON.stringify(sanctions)) };
    } catch(error) {
        return { success: false, message: 'Error al obtener las sanciones.' };
    }
}

export async function getMatchByIdAction(matchId: string) {
    try {
        const match = await getMatchByIdFromDb(matchId);
        if (!match) {
            return { success: false, message: 'Partido no encontrado.' };
        }
        return { success: true, match: JSON.parse(JSON.stringify(match)) };
    } catch(error) {
        return { success: false, message: 'Error al obtener el partido.' };
    }
}




