
'use server';

import type { NosotrosPageConfig, User } from '@/types';
import { getNosotrosPageConfig, updateNosotrosPageConfigInDb } from '@/lib/data/nosotros';
import { revalidatePath } from 'next/cache';
import { logActivity } from '../data/activity';
import { getUserById } from '../data/users';

export async function updateNosotrosPageConfigAction(config: NosotrosPageConfig, userId: string) {
    try {
        const user = await getUserById(userId);
        if (!user) throw new Error("User not found");
        
        const oldConfig = await getNosotrosPageConfig();

        await updateNosotrosPageConfigInDb(config);
        revalidatePath('/nosotros');

        const changes: Record<string, any> = {};
        for (const key in config.main) {
            if (config.main[key as keyof typeof config.main] !== oldConfig.main[key as keyof typeof oldConfig.main]) {
                changes[`main.${key}`] = {
                    old: oldConfig.main[key as keyof typeof oldConfig.main],
                    new: config.main[key as keyof typeof config.main]
                };
            }
        }
        
        await logActivity({ userId, userName: user.name, action: 'update', entityType: 'NosotrosPage', entityId: '1' });

        return { success: true };
    } catch (error) {
        return { success: false, message: 'Error al actualizar la página Nosotros.' };
    }
}
