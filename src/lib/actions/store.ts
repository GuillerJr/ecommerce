

'use server';

import type { StoreConfig } from '@/types';
import { getStoreConfigFromDb, updateStoreConfigInDb } from '@/lib/data/store';
import { logActivity } from '../data/activity';
import { revalidatePath } from 'next/cache';
import { getUserById } from '../data/users';

export async function getStoreConfigAction() {
    try {
        const config = await getStoreConfigFromDb();
        return { success: true, config: JSON.parse(JSON.stringify(config)) };
    } catch (error) {
        return { success: false, message: 'Error al obtener la configuración de la tienda' };
    }
}


export async function updateStoreConfigAction(config: Omit<StoreConfig, 'id'>, userId: string) {
    try {
        const user = await getUserById(userId);
        if (!user) throw new Error("User not found");

        const oldConfig = await getStoreConfigFromDb();
        
        await updateStoreConfigInDb(config);
        
        const changes: Record<string, any> = {};
        for (const key in config) {
            const typedKey = key as keyof Omit<StoreConfig, 'id'>;
             if (JSON.stringify(config[typedKey]) !== JSON.stringify(oldConfig[typedKey])) {
                changes[typedKey] = {
                    old: oldConfig[typedKey],
                    new: config[typedKey]
                };
            }
        }
        
        // Don't log the full signature file content
        if (changes.eSignatureFile) {
            changes.eSignatureFile = { old: '******', new: '******' };
        }

        if (Object.keys(changes).length > 0) {
            await logActivity({ userId, userName: user.name, action: 'update', entityType: 'StoreConfig', entityId: '1', details: changes });
        }

        revalidatePath('/admin/tienda');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al actualizar la configuración de la tienda.' };
    }
}