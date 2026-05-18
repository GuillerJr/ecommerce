
'use server';

import type { Backup } from '@/types';
import { query } from '@/lib/db.server';

export async function createSqlDumpFromDb(): Promise<{ filename: string; content: string }> {
    // Esta es una exportación simplificada para demostración. Para un backup real, usa pg_dump.
    const tablesToBackup = ['products', 'categories', 'subcategories', 'discounts', 'coupons', 'orders', 'users', 'roles', 'giveaways', 'kardex', 'store_config', 'nosotros_page', 'brands', 'activity_logs'];
    let sqlContent = '';

    for (const table of tablesToBackup) {
        const rows = await query<Record<string, unknown>>(`SELECT * FROM ${table}`);
        if (rows.length > 0) {
            const columns = Object.keys(rows[0]).join(', ');
            sqlContent += `\n-- Data for table ${table}\n`;
            for (const row of rows) {
                const values = Object.values(row).map(val => {
                    if (val === null) return 'NULL';
                    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return val;
                }).join(', ');
                sqlContent += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
            }
        }
    }

    const filename = `backup_${new Date().toISOString()}.sql`;
    await query('INSERT INTO backups (filename) VALUES ($1)', [filename]);
    return { filename, content: sqlContent };
}

export async function getBackups(): Promise<Backup[]> {
    return await query<Backup>('SELECT * FROM backups ORDER BY date DESC');
}
