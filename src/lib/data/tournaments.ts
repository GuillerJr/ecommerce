

'use server';

import type { Tournament, TournamentWithDetails, TournamentTeam, TournamentPlayer, Match, MatchEvent, PlayerSanction, Standing } from '@/types';
import { query } from '@/lib/db.server';
import { getClient } from '@/lib/db.server';

export async function getTournaments(): Promise<TournamentWithDetails[]> {
    const result = await query<any>(`
        SELECT 
            t.*,
            (SELECT COUNT(*) FROM tournament_teams tt WHERE tt."tournamentId" = t.id AND tt.status = 'Aprobado') as "approvedTeamsCount"
        FROM tournaments t
        ORDER BY t."createdAt" DESC
    `);

    const tournamentsWithDetails: TournamentWithDetails[] = result.map(tournament => ({
        ...tournament,
        approvedTeamsCount: parseInt(String(tournament.approvedTeamsCount), 10),
    }));

    return tournamentsWithDetails;
}

export async function addTournamentToDb(data: Omit<Tournament, 'id' | 'status' | 'createdAt' | 'championId' | 'endDate'>): Promise<Tournament> {
    const { name, format, numberOfTeams, rules, startDate, groupStageConfig } = data;
    const queryText = `INSERT INTO tournaments (name, format, "numberOfTeams", rules, "startDate", "groupStageConfig") 
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [name, format, numberOfTeams, rules, startDate, groupStageConfig];
    const result = await query<any>(queryText, values);
    return result[0];
}

export async function getTournamentDetailsFromDb(id: string): Promise<TournamentWithDetails | null> {
    try {
        const tournamentResult = await query<any>(`SELECT * FROM tournaments WHERE id = $1`, [id]);
        const tournament = tournamentResult[0];
        if (!tournament) return null;

        const teamsResult = await query<any>(`SELECT * FROM tournament_teams WHERE "tournamentId" = $1`, [id]);
        
        for (const team of teamsResult) {
            const playersResult = await query<TournamentPlayer>(`SELECT * FROM tournament_players WHERE "teamId" = $1`, [team.id]);
            team.players = playersResult;
        }

        const standingsResult = await query<any>(`SELECT * FROM tournament_standings WHERE "tournamentId" = $1 ORDER BY "groupName", points DESC, "goalDifference" DESC, "goalsFor" DESC`, [id]);
        const matchesResult = await query<any>(`SELECT * FROM matches WHERE "tournamentId" = $1`, [id]);
        const eventsResult = await query<any>(`SELECT * FROM match_events WHERE "matchId" IN (SELECT id FROM matches WHERE "tournamentId" = $1)`, [id]);

        return {
            ...tournament,
            teams: teamsResult.map((t: any) => ({...t, players: t.players || []})),
            standings: standingsResult,
            matches: matchesResult,
            events: eventsResult,
            approvedTeamsCount: teamsResult.filter(t => t.status === 'Aprobado').length,
        } as TournamentWithDetails;
    } catch (e) {
        console.error("Error fetching tournament details:", e);
        return null;
    }
}

export async function updateTeamStatusInDb(teamId: string, status: 'Aprobado' | 'Rechazado'): Promise<TournamentTeam> {
    const queryText = 'UPDATE tournament_teams SET status = $1 WHERE id = $2 RETURNING *';
    const values = [status, teamId];
    const result = await query<any>(queryText, values);
    return result[0];
}

async function createMatch(client: any, tournamentId: string, round: string, teamA_Id: string | null, teamB_Id: string | null, groupName?: string): Promise<Match> {
    const queryText = `
        INSERT INTO matches ("tournamentId", "teamA_Id", "teamB_Id", round, "groupName")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const values = [tournamentId, teamA_Id, teamB_Id, round, groupName];
    const result = await client.query<any>(queryText, values);
    return result.rows[0];
}
    
function getRoundName(numTeams: number, totalTeamsInBracket: number): string {
    if (numTeams === 2) return "Final";
    if (numTeams === 4) return "Semifinales";
    if (numTeams === 8) return "Cuartos de Final";
    if (numTeams === 16) return "Octavos de Final";
    if (numTeams === totalTeamsInBracket) return "Ronda 1"; // First round for non-power-of-2
    return `Ronda de ${numTeams}`;
}


export async function generateTournamentMatchesInDb(tournamentId: string): Promise<Match[]> {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const tournamentResult = await client.query<{ format: string, "numberOfTeams": number, "groupStageConfig"?: any }>(`SELECT format, "numberOfTeams", "groupStageConfig" FROM tournaments WHERE id = $1`, [tournamentId]);
        const { format: tournamentFormat, "groupStageConfig": groupConfig } = tournamentResult.rows[0];

        const teamsResult = await client.query<TournamentTeam>(`SELECT id, name FROM tournament_teams WHERE "tournamentId" = $1 AND status = 'Aprobado'`, [tournamentId]);
        let approvedTeams = teamsResult.rows;
        
        // Shuffle teams for random pairing/grouping
        for (let i = approvedTeams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [approvedTeams[i], approvedTeams[j]] = [approvedTeams[j], approvedTeams[i]];
        }
        
        const matches: Match[] = [];

        // Initialize standings for all approved teams in league or group formats
        if (tournamentFormat === 'league' || tournamentFormat === 'groups') {
            for (const team of approvedTeams) {
                await client.query(`
                    INSERT INTO tournament_standings ("tournamentId", "teamId", "groupName", points, played, wins, draws, losses, "goalsFor", "goalsAgainst", "goalDifference")
                    VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 0)
                    ON CONFLICT ("tournamentId", "teamId") DO NOTHING
                `, [tournamentId, team.id, tournamentFormat === 'league' ? null : '']);
            }
        }

        if (tournamentFormat === 'league') {
             let teams = [...approvedTeams];
             if (teams.length % 2 !== 0) teams.push({ id: 'bye', name: 'bye' } as any);
             const numTeams = teams.length;
             const numRounds = numTeams - 1;

             for (let round = 0; round < numRounds; round++) {
                 for (let matchIndex = 0; matchIndex < numTeams / 2; matchIndex++) {
                     const teamA = teams[matchIndex];
                     const teamB = teams[numTeams - 1 - matchIndex];
                     if (teamA.id !== 'bye' && teamB.id !== 'bye') {
                         const newMatch = await createMatch(client, tournamentId, `Jornada ${round + 1}`, teamA.id, teamB.id);
                         matches.push(newMatch);
                     }
                 }
                 // Rotate teams for next round
                 const lastTeam = teams.pop();
                 if (lastTeam) teams.splice(1, 0, lastTeam);
             }
        } else if (tournamentFormat === 'groups') {
            if (!groupConfig || !groupConfig.teamsPerGroup || groupConfig.teamsPerGroup < 2) {
                throw new Error("La configuración de grupos es inválida.");
            }
            const numGroups = Math.ceil(approvedTeams.length / groupConfig.teamsPerGroup);
            const groups: { name: string; teams: TournamentTeam[] }[] = Array.from({ length: numGroups }, (_, i) => ({ name: String.fromCharCode(65 + i), teams: [] }));
            
            // Distribute teams into groups
            approvedTeams.forEach((team, index) => groups[index % numGroups].teams.push(team));

            for (const group of groups) {
                 await client.query('UPDATE tournament_standings SET "groupName" = $1 WHERE "tournamentId" = $2 AND "teamId" = ANY($3::uuid[])', 
                    [group.name, tournamentId, group.teams.map(t => t.id)]);
                
                let teamsInGroup = [...group.teams];
                 if (teamsInGroup.length % 2 !== 0) teamsInGroup.push({ id: 'bye', name: 'bye' } as any);
                const numTeams = teamsInGroup.length;
                const numRounds = numTeams - 1;

                for (let round = 0; round < numRounds; round++) {
                    for (let matchIndex = 0; matchIndex < numTeams / 2; matchIndex++) {
                        const teamA = teamsInGroup[matchIndex];
                        const teamB = teamsInGroup[numTeams - 1 - matchIndex];
                        if (teamA.id !== 'bye' && teamB.id !== 'bye') {
                           const newMatch = await createMatch(client, tournamentId, `Jornada ${round + 1}`, teamA.id, teamB.id, group.name);
                           matches.push(newMatch);
                        }
                    }
                    const lastTeam = teamsInGroup.pop();
                    if(lastTeam) teamsInGroup.splice(1, 0, lastTeam);
                }
            }
        } else if (tournamentFormat === 'bracket') {
            const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
            if (!isPowerOfTwo(approvedTeams.length)) {
                 throw new Error('El número de equipos para un torneo de eliminatoria debe ser una potencia de 2 (ej. 2, 4, 8, 16).');
            }
            let teamIds = approvedTeams.map(t => t.id);
            let currentRoundMatches: Match[] = [];
            const roundName = getRoundName(teamIds.length, teamIds.length);
            for (let i = 0; i < teamIds.length; i += 2) {
                const match = await createMatch(client, tournamentId, roundName, teamIds[i], teamIds[i+1]);
                matches.push(match);
                currentRoundMatches.push(match);
            }
            let previousRoundMatches = currentRoundMatches;
            while (previousRoundMatches.length > 1) {
                const nextRoundMatches = [];
                const nextRoundName = getRoundName(previousRoundMatches.length, teamIds.length);
                for (let i = 0; i < previousRoundMatches.length; i += 2) {
                    const match = await createMatch(client, tournamentId, nextRoundName, null, null);
                    await client.query('UPDATE matches SET "nextMatchId" = $1 WHERE id = $2 OR id = $3', [match.id, previousRoundMatches[i].id, previousRoundMatches[i+1].id]);
                    nextRoundMatches.push(match);
                    matches.push(match);
                }
                previousRoundMatches = nextRoundMatches;
            }
        }
        
        await client.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['En Curso', tournamentId]);
        await client.query('COMMIT');
        return matches;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error generating matches:", error);
        throw error;
    } finally {
        client.release();
    }
}

export async function addTeamToTournament(data: any): Promise<TournamentTeam> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { tournamentId, userId, name, players } = data;
        const teamQueryText = `
            INSERT INTO tournament_teams ("tournamentId", "userId", name, status)
            VALUES ($1, $2, $3, 'Pendiente')
            RETURNING id
        `;
        const teamValues = [tournamentId, userId, name];
        const teamResult = await client.query<{ id: string }>(teamQueryText, teamValues);
        const teamId = teamResult.rows[0].id;
        const playerQueryText = `
            INSERT INTO tournament_players ("teamId", name, position, dorsal)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        for (const player of players) {
            const playerValues = [teamId, player.name, player.position, player.dorsal];
            await client.query(playerQueryText, playerValues);
        }
        const selectTeamQuery = `SELECT * FROM tournament_teams WHERE id = $1`;
        const selectTeamResult = await client.query<any>(selectTeamQuery, [teamId]);
        const newTeam = selectTeamResult.rows[0];
        await client.query('COMMIT');
        return newTeam;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error adding team to tournament:", error);
        throw error;
    } finally {
        client.release();
    }
}

export async function updateMatchScoreInDb(matchId: string, events: Omit<MatchEvent, 'id' | 'createdAt'|'matchId'>[]): Promise<Match> {
    const client = await getClient();

    try {
        await client.query('BEGIN');
        
        await client.query('DELETE FROM match_events WHERE "matchId" = $1', [matchId]);

        let scoreA = 0;
        let scoreB = 0;
        
        const matchRes = await client.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        const currentMatch = matchRes.rows[0];
        const { "teamA_Id": teamA_Id, "teamB_Id": teamB_Id, "tournamentId": tournamentId, "nextMatchId": nextMatchId } = currentMatch;

        for (const event of events) {
            if (event.type === 'goal') {
                if (event.teamId === teamA_Id) scoreA++;
                else if (event.teamId === teamB_Id) scoreB++;
            }
             await client.query(
                'INSERT INTO match_events ("matchId", "playerId", "teamId", type, minute) VALUES ($1, $2, $3, $4, $5)',
                [matchId, event.playerId, event.teamId, event.type, event.minute]
            );
        }
        
        const winnerId = scoreA > scoreB ? teamA_Id : (scoreB > scoreA ? teamB_Id : null);

        const updateQueryText = `
            UPDATE matches SET "scoreA" = $1, "scoreB" = $2, status = 'Finalizado', "winnerId" = $3 WHERE id = $4 RETURNING *`;
        const values = [scoreA, scoreB, winnerId, matchId];
        const updateResult = await client.query<any>(updateQueryText, values);
        const updatedMatch = updateResult.rows[0];

        const tournamentRes = await client.query('SELECT format FROM tournaments WHERE id = $1', [tournamentId]);
        const tournamentFormat = tournamentRes.rows[0].format;

        if (tournamentFormat === 'bracket' && nextMatchId && winnerId) {
             const nextMatchRes = await client.query('SELECT * FROM matches WHERE id = $1', [nextMatchId]);
             if (nextMatchRes.rows.length > 0) {
                 const nextMatch = nextMatchRes.rows[0];
                 if (!nextMatch.teamA_Id) {
                     await client.query('UPDATE matches SET "teamA_Id" = $1 WHERE id = $2', [winnerId, nextMatchId]);
                 } else if (!nextMatch.teamB_Id) {
                     await client.query('UPDATE matches SET "teamB_Id" = $1 WHERE id = $2', [winnerId, nextMatchId]);
                 }
             }
        } else if(tournamentFormat === 'bracket' && !nextMatchId && winnerId) {
             // This is the final match
             await client.query('UPDATE tournaments SET status = $1, "championId" = $2, "endDate" = $3 WHERE id = $4', ['Finalizado', winnerId, new Date(), tournamentId]);
        }
        
        if (tournamentId && (tournamentFormat === 'league' || tournamentFormat === 'groups')) {
            await recalculateStandings(client, tournamentId, teamA_Id);
            await recalculateStandings(client, tournamentId, teamB_Id);
        }
        
        if (tournamentFormat === 'groups') {
            await checkAndGenerateKnockoutStage(client, tournamentId);
        }

        await client.query('COMMIT');
        return updatedMatch;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error updating match score:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function checkAndGenerateKnockoutStage(client: any, tournamentId: string) {
    const tournamentRes = await client.query('SELECT "groupStageConfig" FROM tournaments WHERE id = $1', [tournamentId]);
    if (!tournamentRes.rows[0] || !tournamentRes.rows[0].groupStageConfig) return;

    const groupConfig = tournamentRes.rows[0].groupStageConfig;
    const { teamsAdvancing } = groupConfig;

    const groupStageMatchesRes = await client.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'Finalizado\') as finished FROM matches WHERE "tournamentId" = $1 AND "groupName" IS NOT NULL', [tournamentId]);
    const { total, finished } = groupStageMatchesRes.rows[0];

    // If all group matches are finished and there are no knockout matches yet
    if (total > 0 && total === finished) {
        const knockoutMatchesRes = await client.query('SELECT COUNT(*) as count FROM matches WHERE "tournamentId" = $1 AND "groupName" IS NULL', [tournamentId]);
        if (knockoutMatchesRes.rows[0].count > 0) return; // Knockout already generated

        const standingsRes = await client.query('SELECT * FROM tournament_standings WHERE "tournamentId" = $1 ORDER BY "groupName", points DESC, "goalDifference" DESC, "goalsFor" DESC', [tournamentId]);
        
        const groups: Record<string, any[]> = {};
        standingsRes.rows.forEach(s => {
            if (!groups[s.groupName]) groups[s.groupName] = [];
            groups[s.groupName].push(s);
        });
        
        const advancingTeams: string[] = [];
        Object.values(groups).forEach(groupStandings => {
            advancingTeams.push(...groupStandings.slice(0, teamsAdvancing).map(s => s.teamId));
        });
        
        if(advancingTeams.length < 2) return;
        
        // Simple bracket generation for advancing teams
        for (let i = advancingTeams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [advancingTeams[i], advancingTeams[j]] = [advancingTeams[j], advancingTeams[i]];
        }
        
        let currentRoundTeams = advancingTeams;
        while(currentRoundTeams.length > 1) {
            const roundName = getRoundName(currentRoundTeams.length, currentRoundTeams.length);
            const nextRoundTeams = [];
            for (let i = 0; i < currentRoundTeams.length; i += 2) {
                const newMatch = await createMatch(client, tournamentId, roundName, currentRoundTeams[i], currentRoundTeams[i+1]);
                nextRoundTeams.push(newMatch); // placeholder for next round logic
            }
            // For simplicity, we are not creating the full bracket tree for group-based knockouts yet
            break; 
        }
    }
}


async function recalculateStandings(client: any, tournamentId: string, teamId: string) {
    if (!teamId) return;
    const teamRes = await client.query('SELECT "groupName" FROM tournament_standings WHERE "teamId" = $1 AND "tournamentId" = $2', [teamId, tournamentId]);
    if (teamRes.rows.length === 0) return;
    const groupName = teamRes.rows[0].groupName;


    const matchesRes = await client.query(`
        SELECT * FROM matches 
        WHERE "tournamentId" = $1 AND ("teamA_Id" = $2 OR "teamB_Id" = $2) AND status = 'Finalizado'`, 
        [tournamentId, teamId]
    );

    let points = 0, played = 0, wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

    for (const match of matchesRes.rows) {
        played++;
        if (match.teamA_Id === teamId) {
            goalsFor += match.scoreA;
            goalsAgainst += match.scoreB;
            if (match.scoreA > match.scoreB) {
                wins++;
                points += 3;
            } else if (match.scoreA === match.scoreB) {
                draws++;
                points += 1;
            } else {
                losses++;
            }
        } else { // teamB
            goalsFor += match.scoreB;
            goalsAgainst += match.scoreA;
            if (match.scoreB > match.scoreA) {
                wins++;
                points += 3;
            } else if (match.scoreB === match.scoreA) {
                draws++;
                points += 1;
            } else {
                losses++;
            }
        }
    }
    
    await client.query(`
        UPDATE tournament_standings SET
            points = $1,
            played = $2,
            wins = $3,
            draws = $4,
            losses = $5,
            "goalsFor" = $6,
            "goalsAgainst" = $7,
            "goalDifference" = $8
        WHERE "tournamentId" = $9 AND "teamId" = $10
    `, [points, played, wins, draws, losses, goalsFor, goalsAgainst, goalsFor - goalsAgainst, tournamentId, teamId]);
}


export async function getMatchEventsFromDb(matchId: string): Promise<MatchEvent[]> {
    try {
        const result = await query<any>(`SELECT * FROM match_events WHERE "matchId" = $1`, [matchId]);
        return result;
    } catch (error) {
        console.error("Error fetching match events:", error);
        return [];
    }
}

export async function getPlayerSanctionsFromDb(tournamentId: string): Promise<PlayerSanction[]> {
    const queryText = `SELECT * FROM player_sanctions WHERE "tournamentId" = $1`;
    const values = [tournamentId];
    const result = await query<any>(queryText, values);
    return result.map((s: any) => ({...s, isActive: s.isActive}));
}

export async function getMatchByIdFromDb(matchId: string): Promise<Match | null> {
    try {
        const matchResult = await query<any>(`SELECT * FROM matches WHERE id = $1`, [matchId]);
        const row = matchResult[0];
        if (!row) return null;
        return row;
    } catch (error) {
        console.error("Error fetching match:", error);
        return null;
    }
}
