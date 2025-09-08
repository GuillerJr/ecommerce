
'use server';

import { getProductById } from '@/lib/data/products';
import { getTournamentDetailsFromDb as getTournamentDetails } from '@/lib/data/tournaments';
import { getCategoryBySubcategoryId } from '@/lib/data/categories';

type BreadcrumbItem = {
    label: string;
    href: string;
};

// Mapeo de segmentos de URL a etiquetas legibles
const segmentLabels: Record<string, string> = {
    admin: 'Admin',
    dashboard: 'Dashboard',
    pos: 'Punto de Venta',
    pedidos: 'Pedidos',
    productos: 'Productos',
    inventario: 'Añadir Stock',
    'importar-exportar': 'Importar/Exportar',
    torneos: 'Torneos',
    liga: 'Liga',
    grupos: 'Grupos',
    eliminatoria: 'Eliminatoria',
    partido: 'Partido',
    categorias: 'Categorías',
    subcategorias: 'Subcategorías',
    marcas: 'Marcas',
    descuentos: 'Descuentos',
    cupones: 'Cupones',
    sorteos: 'Sorteos',
    usuarios: 'Usuarios',
    roles: 'Roles y Permisos',
    resenas: 'Reseñas',
    kardex: 'Kardex',
    actividad: 'Actividad',
    backup: 'Backup',
    tienda: 'Tienda',
    nosotros: 'Nosotros',
    product: 'Producto',
    checkout: 'Checkout',
    compare: 'Comparar',
    'comprar-nuevamente': 'Comprar Nuevamente',
    configuracion: 'Configuración',
    contacto: 'Contacto',
    direcciones: 'Direcciones',
    favoritos: 'Favoritos',
    'historial-busqueda': 'Vistos Recientemente',
    login: 'Iniciar Sesión',
    ofertas: 'Ofertas',
    perfil: 'Perfil',
    privacidad: 'Política de Privacidad',
    register: 'Registro',
    terminos: 'Términos de Servicio',
};

/**
 * Genera breadcrumbs para las rutas de administración.
 * @param pathname - La ruta actual.
 * @returns Un objeto con los breadcrumbs o un error.
 */
export async function getAdminBreadcrumbData(pathname: string): Promise<{ success: boolean; breadcrumbs?: BreadcrumbItem[] }> {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    let currentPath = '';
    for (const segment of segments) {
        currentPath += `/${segment}`;
        let label = segmentLabels[segment] || segment;

        // Lógica para obtener nombres dinámicos
        if (segments.indexOf(segment) > 1 && (segments[segments.indexOf(segment) - 2] === 'torneos')) {
             if(segment !== 'liga' && segment !== 'grupos' && segment !== 'eliminatoria' && segment !== 'partido') {
                const tournament = await getTournamentDetails(segment);
                if (tournament) {
                    label = tournament.name;
                }
             }
        }
        
        breadcrumbs.push({ label, href: currentPath });
    }

    return { success: true, breadcrumbs };
}


/**
 * Genera breadcrumbs para las rutas públicas.
 * @param pathname - La ruta actual.
 * @param searchParams - Los parámetros de búsqueda de la URL.
 * @returns Un objeto con los breadcrumbs o un error.
 */
export async function getBreadcrumbData(pathname: string, searchParams: string): Promise<{ success: boolean, breadcrumbs?: BreadcrumbItem[] }> {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Inicio', href: '/' }];
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        currentPath += `/${segment}`;
        let label = segmentLabels[segment] || segment;

        if (segment === 'product' && i < segments.length - 1) {
            const productId = segments[i + 1];
            const product = await getProductById(productId);
            if (product && product.status === 'Activo') {
                const category = await getCategoryBySubcategoryId(product.subcategoryId);
                // Añadir 'Tienda' y 'Categoría' al breadcrumb
                breadcrumbs.push({ label: 'Tienda', href: '/tienda' });
                if (category && category.status === 'Activo') {
                    breadcrumbs.push({ label: category.name, href: `/tienda?category=${encodeURIComponent(category.name)}` });
                }
                label = product.name;
            } else {
                label = 'Producto No Encontrado';
            }
        }
        
        if (segment === 'tienda' && searchParams) {
             const params = new URLSearchParams(searchParams);
             const category = params.get('category');
             const subcategory = params.get('subcategory');
             if(subcategory) label = subcategory;
             else if (category) label = category;
        }

        // Evitar duplicar el segmento de producto si ya se manejó
        if (segments[i-1] !== 'product') {
            breadcrumbs.push({ href: currentPath, label });
        }
    }

    return { success: true, breadcrumbs };
}
