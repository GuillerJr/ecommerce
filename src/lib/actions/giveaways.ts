
'use server';

import type { Giveaway } from '@/types';
import { 
    getGiveawaysFromDb, 
    addGiveawayToDb, 
    updateGiveawayInDb, 
    deleteGiveawayFromDb, 
    addParticipantToGiveawayInDb, 
    drawWinnerForGiveawayInDb,
    getGiveawayById 
} from '@/lib/data/giveaways';
import { sendGiveawayWinnerEmail } from '@/lib/email.server';
import { revalidatePath } from 'next/cache';
import { requirePermission, requireUser } from '@/lib/auth/session';

export async function getGiveawaysAction() {
    try {
        const giveaways = await getGiveawaysFromDb();
        return { success: true, giveaways: JSON.parse(JSON.stringify(giveaways)) };
    } catch (error) {
        return { success: false, message: 'Error al obtener los sorteos' };
    }
}

export async function addGiveawayAction(giveawayData: Omit<Giveaway, 'id' | 'status' | 'winnerId' | 'participants'>) {
    try {
        await requirePermission('manage_giveaways');
        await addGiveawayToDb(giveawayData);
        revalidatePath('/admin/sorteos');
        revalidatePath('/sorteos');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al añadir sorteo' };
    }
}

export async function updateGiveawayAction(giveaway: Giveaway) {
    try {
        await requirePermission('manage_giveaways');
        await updateGiveawayInDb(giveaway);
        revalidatePath('/admin/sorteos');
        revalidatePath('/sorteos');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al actualizar sorteo' };
    }
}

export async function deleteGiveawayAction(id: string): Promise<{ success: boolean; message?: string; }> {
    try {
        await requirePermission('manage_giveaways');
        await deleteGiveawayFromDb(id);
        revalidatePath('/admin/sorteos');
        revalidatePath('/sorteos');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al eliminar el sorteo.' };
    }
}

export async function participateInGiveawayAction(giveawayId: string, userId: string) {
    try {
        const currentUser = await requireUser();
        if (currentUser.id !== userId) return { success: false, message: 'No autorizado.' };
        const result = await addParticipantToGiveawayInDb(giveawayId, currentUser.id);
        if (result.success) {
            revalidatePath('/sorteos');
        }
        return result;
    } catch (error) {
        return { success: false, message: 'Error al participar en el sorteo.' };
    }
}

export async function drawWinnerAction(giveawayId: string) {
    try {
        await requirePermission('manage_giveaways');
        const giveaway = await getGiveawayById(giveawayId);
        if (!giveaway) return { success: false, message: 'Sorteo no encontrado.' };

        const result = await drawWinnerForGiveawayInDb(giveawayId);
        if (result.success && result.winner) {
            revalidatePath('/admin/sorteos');
            revalidatePath('/sorteos');
            await sendGiveawayWinnerEmail(result.winner, giveaway);
        }
        return {
            success: result.success,
            winner: result.winner ? JSON.parse(JSON.stringify(result.winner)) : null,
            message: result.message
        };
    } catch (error) {
        return { success: false, message: 'Error al elegir un ganador.' };
    }
}
