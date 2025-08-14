

'use server';

import type { Giveaway, GiveawayPrize, User } from '@/types';
import { query } from '@/lib/db.server';
import { getClient } from '@/lib/db.server';
import { getUserById } from './users';

export async function getGiveawaysFromDb(): Promise<Giveaway[]> {
    const queryText = `
        SELECT 
            g.*,
            (SELECT json_agg(gp."productId") FROM giveaway_prizes gp WHERE gp."giveawayId" = g.id) as "productPrizeIds",
            (SELECT json_agg(p."userId") FROM giveaway_participants p WHERE p."giveawayId" = g.id) as participants
        FROM giveaways g
        ORDER BY g."startDate" DESC;
    `;
    const result = await query<any>(queryText);
    return result.map(row => ({
        ...row,
        entryType: row.entryType,
        minPurchaseAmount: row.minPurchaseAmount,
        startDate: row.startDate,
        endDate: row.endDate,
        winnerId: row.winnerId,
        productPrizeIds: row.productPrizeIds || [],
        participants: row.participants || [],
    }));
}

export async function getGiveawayById(id: string): Promise<Giveaway | null> {
    const queryText = `
        SELECT 
            g.*,
            (SELECT json_agg(gp."productId") FROM giveaway_prizes gp WHERE gp."giveawayId" = g.id) as "productPrizeIds",
            (SELECT json_agg(p."userId") FROM giveaway_participants p WHERE p."giveawayId" = g.id) as participants
        FROM giveaways g
        WHERE g.id = $1;
    `;
    const result = await query<any>(queryText, [id]);
    const row = result[0];
    if (!row) return null;
    return {
        ...row,
        entryType: row.entryType,
        minPurchaseAmount: row.minPurchaseAmount,
        startDate: row.startDate,
        endDate: row.endDate,
        winnerId: row.winnerId,
        productPrizeIds: row.productPrizeIds || [],
        participants: row.participants || [],
    };
}

export async function addGiveawayToDb(giveawayData: Omit<Giveaway, 'id' | 'status' | 'winnerId' | 'participants'>): Promise<Giveaway> {
    const { name, description, entryType, minPurchaseAmount, productPrizeIds, startDate, endDate } = giveawayData;
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const giveawayQuery = 'INSERT INTO giveaways (name, description, "entryType", "minPurchaseAmount", "startDate", "endDate", status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
        const giveawayValues = [name, description, entryType, minPurchaseAmount, startDate, endDate, 'Programado'];
        const giveawayResult = await client.query<any>(giveawayQuery, giveawayValues);
        const newGiveaway = giveawayResult.rows[0];

        if (productPrizeIds && productPrizeIds.length > 0) {
            const prizeQuery = 'INSERT INTO giveaway_prizes ("giveawayId", "productId") VALUES ($1, $2)';
            for (const productId of productPrizeIds) {
                await client.query(prizeQuery, [newGiveaway.id, productId]);
            }
        }
        
        await client.query('COMMIT');
        
        const finalGiveaway = await getGiveawayById(newGiveaway.id);
        if (!finalGiveaway) throw new Error("Failed to retrieve the newly created giveaway.");
        return finalGiveaway;
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in addGiveawayToDb:", e);
        throw e;
    } finally {
        client.release();
    }
}

export async function updateGiveawayInDb(giveaway: Giveaway): Promise<void> {
    const { id, name, description, entryType, minPurchaseAmount, productPrizeIds, startDate, endDate, status, winnerId } = giveaway;
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const giveawayQuery = 'UPDATE giveaways SET name = $1, description = $2, "entryType" = $3, "minPurchaseAmount" = $4, "startDate" = $5, "endDate" = $6, status = $7, "winnerId" = $8 WHERE id = $9';
        const giveawayValues = [name, description, entryType, minPurchaseAmount, startDate, endDate, status, winnerId, id];
        await client.query(giveawayQuery, giveawayValues);

        await client.query('DELETE FROM giveaway_prizes WHERE "giveawayId" = $1', [id]);

        if (productPrizeIds && productPrizeIds.length > 0) {
            const prizeQuery = 'INSERT INTO giveaway_prizes ("giveawayId", "productId") VALUES ($1, $2)';
            for (const productId of productPrizeIds) {
                await client.query(prizeQuery, [id, productId]);
            }
        }
        
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in updateGiveawayInDb:", e);
        throw e;
    } finally {
        client.release();
    }
}


export async function deleteGiveawayFromDb(id: string): Promise<void> {
    await query('UPDATE giveaways SET status = \'Inactivo\' WHERE id = $1', [id]);
}

export async function addParticipantToGiveawayInDb(giveawayId: string, userId: string): Promise<{ success: boolean; message?: string; }> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const giveawayRes = await client.query('SELECT * FROM giveaways WHERE id = $1 FOR UPDATE', [giveawayId]);
        const giveaway = giveawayRes.rows[0];

        if (!giveaway) {
            throw new Error('Sorteo no encontrado.');
        }
        if (giveaway.status !== 'Activo') {
            throw new Error('Este sorteo no está activo.');
        }
        
        const existingParticipant = await client.query('SELECT * FROM giveaway_participants WHERE "giveawayId" = $1 AND "userId" = $2', [giveawayId, userId]);
        if (existingParticipant.rows.length > 0) {
            throw new Error('Ya estás participando en este sorteo.');
        }
        
        if (giveaway.entryType === 'purchase_based') {
            const ordersRes = await client.query('SELECT SUM(total) as total_spent FROM orders WHERE email = (SELECT email FROM users WHERE id = $1) AND date >= $2', [userId, giveaway.startDate]);
            const totalSpent = ordersRes.rows[0].total_spent || 0;
            if (totalSpent < giveaway.minPurchaseAmount) {
                throw new Error(`Necesitas haber gastado al menos $${giveaway.minPurchaseAmount.toFixed(2)} para participar.`);
            }
        }

        await client.query('INSERT INTO giveaway_participants ("giveawayId", "userId") VALUES ($1, $2)', [giveawayId, userId]);
        await client.query('COMMIT');
        return { success: true };
    } catch (e: any) {
        await client.query('ROLLBACK');
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

export async function drawWinnerForGiveawayInDb(giveawayId: string): Promise<{ success: boolean; winner?: any; message?: string; }> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const giveawayRes = await client.query('SELECT * FROM giveaways WHERE id = $1 FOR UPDATE', [giveawayId]);
        const giveaway = giveawayRes.rows[0];

        if (!giveaway) {
            throw new Error('Sorteo no encontrado.');
        }

        const participantsRes = await client.query('SELECT "userId" FROM giveaway_participants WHERE "giveawayId" = $1', [giveawayId]);
        const participants = participantsRes.rows.map(r => r.userId);
        
        if (participants.length === 0) {
            throw new Error('No hay participantes en este sorteo.');
        }

        const winnerId = participants[Math.floor(Math.random() * participants.length)];
        await client.query('UPDATE giveaways SET "winnerId" = $1, status = \'Finalizado\' WHERE id = $2', [winnerId, giveawayId]);
        
        const winner = await getUserById(winnerId);
        
        await client.query('COMMIT');
        return { success: true, winner: winner || undefined };
    } catch (e: any) {
        await client.query('ROLLBACK');
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}
