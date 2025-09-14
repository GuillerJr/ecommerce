
'use server';

import { query, getClient } from '@/lib/db.server';
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
  return result.map(s => ({
      ...s,
      likes: s.likes || [],
      dislikes: s.dislikes || [],
  }));
}

export async function updateSuggestionVotesInDb(suggestionId: string, userId: string, voteType: 'like' | 'dislike'): Promise<void> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const res = await client.query('SELECT likes, dislikes FROM suggestions WHERE id = $1 FOR UPDATE', [suggestionId]);
        if (res.rows.length === 0) {
            throw new Error('Sugerencia no encontrada.');
        }

        const { likes, dislikes } = res.rows[0];
        const likesSet = new Set<string>(likes || []);
        const dislikesSet = new Set<string>(dislikes || []);

        if (voteType === 'like') {
            if (likesSet.has(userId)) {
                likesSet.delete(userId); // Unlike
            } else {
                likesSet.add(userId); // Like
                dislikesSet.delete(userId); // Remove from dislikes if it exists
            }
        } else { // voteType === 'dislike'
            if (dislikesSet.has(userId)) {
                dislikesSet.delete(userId); // Undislike
            } else {
                dislikesSet.add(userId); // Dislike
                likesSet.delete(userId); // Remove from likes if it exists
            }
        }

        await client.query(
            'UPDATE suggestions SET likes = $1, dislikes = $2 WHERE id = $3',
            [JSON.stringify(Array.from(likesSet)), JSON.stringify(Array.from(dislikesSet)), suggestionId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
