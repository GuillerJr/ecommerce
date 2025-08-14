'use server';

import { createSqlDumpFromDb } from '@/lib/data/backups';
import { revalidatePath } from 'next/cache';

export async function createBackupAction() {
    try {
        const { filename, content } = await createSqlDumpFromDb();
        revalidatePath('/admin/backup');
        return { success: true, filename, content };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo crear el archivo de backup.';
        return { success: false, message };
    }
}
