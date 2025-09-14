
'use server';

import { revalidatePath } from 'next/cache';
import { addSuggestionToDb, getSuggestionsFromDb, updateSuggestionVotesInDb } from '@/lib/data/suggestions';
import { getUserById } from '@/lib/data/users';

export async function addSuggestionAction(suggestion: string, userId: string, userName: string) {
    try {
        await addSuggestionToDb({ suggestion, userId, userName });
        revalidatePath('/sugerencias');
        revalidatePath('/admin/sugerencias');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al enviar la sugerencia.' };
    }
}

export async function getSuggestionsAction() {
    try {
        const suggestions = await getSuggestionsFromDb();
        return { success: true, suggestions: JSON.parse(JSON.stringify(suggestions)) };
    } catch (error) {
        return { success: false, message: 'Error al obtener las sugerencias.' };
    }
}

export async function voteOnSuggestionAction(suggestionId: string, userId: string, voteType: 'like' | 'dislike') {
    try {
        await updateSuggestionVotesInDb(suggestionId, userId, voteType);
        revalidatePath('/sugerencias');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al procesar el voto.';
        return { success: false, message };
    }
}
