

'use server';

import type { Role } from '@/types';
import { addRoleToDb, updateRoleInDb, getRolesFromDb, getRoleById } from '@/lib/data/roles';
import { revalidatePath } from 'next/cache';
import { logActivity } from '../data/activity';
import { getUserById } from '../data/users';

export async function addRoleAction(roleData: Omit<Role, 'id'>, adminUserId: string) {
    try {
        const newRole = await addRoleToDb(roleData);
        const adminUser = await getUserById(adminUserId);
        const { ...roleToLog } = newRole;
        await logActivity({
            userId: adminUserId,
            userName: adminUser?.name || 'Sistema',
            action: 'create',
            entityType: 'Role',
            entityId: newRole.id,
            details: roleToLog,
        });
        revalidatePath('/admin/roles');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al añadir rol' };
    }
}

export async function updateRoleAction(role: Role, adminUserId: string) {
    try {
        const oldRole = await getRoleById(role.id);
        if (!oldRole) throw new Error("Role not found");

        await updateRoleInDb(role);

        const adminUser = await getUserById(adminUserId);
        
        const changes: Record<string, any> = {};
        for (const key in role) {
            const typedKey = key as keyof Role;
            if (JSON.stringify(role[typedKey]) !== JSON.stringify(oldRole[typedKey])) {
                changes[typedKey] = {
                    old: oldRole[typedKey],
                    new: role[typedKey]
                };
            }
        }

        if (Object.keys(changes).length > 0) {
            await logActivity({
                userId: adminUserId,
                userName: adminUser?.name || 'Sistema',
                action: 'update',
                entityType: 'Role',
                entityId: role.id,
                details: changes,
            });
        }
        revalidatePath('/admin/roles');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al actualizar rol' };
    }
}

export async function getRolesAction() {
    try {
        const roles = await getRolesFromDb();
        return { success: true, roles };
    } catch (error) {
        return { success: false, message: 'Error al obtener los roles' };
    }
}
