
'use server';

import type { Role } from '@/types';
import { query } from '@/lib/db.server';

export async function getRolesFromDb(): Promise<Role[]> {
    return await query<Role>('SELECT * FROM roles ORDER BY name');
}

export async function getRoleById(id: string): Promise<Role | null> {
    const result = await query<Role>(`SELECT * FROM roles WHERE id = $1`, [id]);
    return result[0] || null;
}

export async function addRoleToDb(roleData: Omit<Role, 'id'>): Promise<Role> {
    const { name, permissions, status } = roleData;
    const queryText = 'INSERT INTO roles (name, permissions, status) VALUES ($1, $2, $3) RETURNING *';
    const values = [name, JSON.stringify(permissions), status];
    const result = await query<Role>(queryText, values);
    return result[0];
}

export async function updateRoleInDb(role: Role): Promise<Role> {
    const { id, name, permissions, status } = role;
    const queryText = 'UPDATE roles SET name = $1, permissions = $2, status = $3 WHERE id = $4 RETURNING *';
    const values = [name, JSON.stringify(permissions), status, id];
    const result = await query<Role>(queryText, values);
    return result[0];
}
