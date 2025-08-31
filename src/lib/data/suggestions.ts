
'use server';

import { query } from '@/lib/db.server';
import type { Suggestion } from '@/types';

export async function addSuggestionToDb(suggestionData: {
  suggestion: string;
  userId: string;
  userName: string;
}): Promise<Suggestion> {
  const { suggestion, userId, userName } = suggestionData;
  const queryText = `
    INSERT INTO suggestions (suggestion, "userId", "userName")
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [suggestion, userId, userName];
  const result = await query<any>(queryText, values);
  return result[0];
}

export async function getSuggestionsFromDb(): Promise<Suggestion[]> {
  const result = await query<any>('SELECT * FROM suggestions ORDER BY "createdAt" DESC');
  return result;
}
