
'use server';

import type { ActivityLog } from '@/types';
import { query } from '@/lib/db.server';

export async function logActivity(logData: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<ActivityLog> {
    const { userId, userName, action, entityType, entityId, details } = logData;
    const queryText = 'INSERT INTO activity_logs ("userId", "userName", action, "entityType", "entityId", details) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [userId, userName, action, entityType, entityId, JSON.stringify(details || {})];
    const result = await query<any>(queryText, values);
    const row = result[0];
    return {
        ...row,
        userId: row.userId,
        userName: row.userName,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt,
    };
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
    const result = await query<any>('SELECT * FROM activity_logs ORDER BY "createdAt" DESC');
    return result.map(row => ({
        ...row,
        userId: row.userId,
        userName: row.userName,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt,
    }));
}
