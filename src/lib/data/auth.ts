
'use server';

import { query } from '@/lib/db.server';
import type { User } from '@/types';

export async function getUserByEmail(email: string): Promise<User | null> {
    const result = await query<any>('SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u."roleId" = r.id WHERE email = $1', [email.toLowerCase()]);
    const row = result[0];
    if (!row) return null;
    return {
        ...row,
        role: row.role_name || 'user',
    };
}

export async function getUserByResetTokenFromDb(token: string): Promise<User | null> {
    const result = await query<any>('SELECT * FROM users WHERE "resetPasswordToken" = $1 AND "resetPasswordExpires" > NOW()', [token]);
    const row = result[0];
    if (!row) return null;
    const role = await query<any>('SELECT name FROM roles WHERE id = $1', [row.roleId]);
    return {
        ...row,
        role: role[0]?.name || 'user',
    };
}

export async function getUserByVerificationToken(token: string): Promise<User | null> {
    const result = await query<any>('SELECT * FROM users WHERE "verificationToken" = $1 AND "verificationTokenExpires" > NOW()', [token]);
    const row = result[0];
    if (!row) return null;
    const role = await query<any>('SELECT name FROM roles WHERE id = $1', [row.roleId]);
    return {
        ...row,
        role: role[0]?.name || 'user',
    };
}
