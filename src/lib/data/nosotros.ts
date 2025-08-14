
'use server';

import type { NosotrosPageConfig } from '@/types';
import { query } from '@/lib/db.server';

export async function getNosotrosPageConfig(): Promise<NosotrosPageConfig> {
    try {
        const result = await query<{ main: any, pillars: any }>('SELECT main, pillars FROM nosotros_page WHERE id = 1');
        if (result.length > 0) {
            return {
                main: result[0].main,
                pillars: result[0].pillars
            };
        }
        // If no config is found, throw an error to be caught by Next.js error boundaries.
        throw new Error("No se encontró la configuración para la página 'Nosotros'.");
    } catch (error) {
        console.error("Error al obtener la configuración de 'Nosotros':", error);
        // Re-throw the error to let Next.js handle it.
        throw new Error("No se pudo cargar la configuración de la página 'Nosotros'.");
    }
}

export async function updateNosotrosPageConfigInDb(config: NosotrosPageConfig): Promise<void> {
    const { main, pillars } = config;
    await query('UPDATE nosotros_page SET main = $1, pillars = $2 WHERE id = 1', [main, pillars]);
}
