
'use server';

import { createSqlDumpFromDb } from '@/lib/data/backups';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';

export async function createBackupAction() {
    try {
        await requirePermission('manage_backups');
        const { filename, content } = await createSqlDumpFromDb();
        revalidatePath('/admin/backup');
        return { success: true, filename, content, message: `El archivo ${filename} ha sido generado.` };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo crear el archivo de backup.';
        return { success: false, message };
    }
}
