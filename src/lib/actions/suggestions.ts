
'use server';

import { revalidatePath } from 'next/cache';
import { addSuggestionToDb, getSuggestionsFromDb } from '@/lib/data/suggestions';

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
