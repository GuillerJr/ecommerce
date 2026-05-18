
'use server';

import type { NosotrosPageConfig } from '@/types';
import { query } from '@/lib/db.server';

const fallbackNosotrosConfig: NosotrosPageConfig = {
    main: {
        title: 'Nuestra Pasión es el Deporte',
        p1: 'En HackTrickStore, vivimos y respiramos deporte.',
        p2: 'Equipamos a atletas con productos de alto rendimiento.',
        imageUrl: 'https://placehold.co/600x400.png',
    },
    pillars: {
        title: 'Nuestros Pilares',
        description: 'Rendimiento, calidad y pasión por el deporte.',
        items: [],
    },
};

export async function getNosotrosPageConfig(): Promise<NosotrosPageConfig> {
    try {
        const result = await query<{ main: any, pillars: any }>('SELECT main, pillars FROM nosotros_page WHERE id = 1');
        if (result.length > 0) {
            return {
                main: result[0].main,
                pillars: result[0].pillars
            };
        }
        return fallbackNosotrosConfig;
    } catch (error) {
        console.error("Error al obtener la configuración de 'Nosotros':", error);
        return fallbackNosotrosConfig;
    }
}

export async function updateNosotrosPageConfigInDb(config: NosotrosPageConfig): Promise<void> {
    const { main, pillars } = config;
    await query('UPDATE nosotros_page SET main = $1, pillars = $2 WHERE id = 1', [main, pillars]);
}
