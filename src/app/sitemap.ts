import { getProductsFromDb } from '@/lib/data/products';
import { getStoreConfigFromDb } from '@/lib/data/store';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  let products: Awaited<ReturnType<typeof getProductsFromDb>> = [];

  try {
    const storeConfig = await getStoreConfigFromDb();
    baseUrl = storeConfig.baseUrl || baseUrl;
    products = await getProductsFromDb();
  } catch (error) {
    console.error('No se pudo generar el sitemap desde la base de datos, usando rutas estáticas.', error);
  }

  // Rutas estáticas
  const staticRoutes = [
    '',
    '/tienda',
    '/ofertas',
    '/nosotros',
    '/contacto',
    '/sorteos',
    '/login',
    '/register',
    '/privacidad',
    '/terminos',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
  }));

  // Rutas dinámicas de productos
  const productRoutes = products
    .filter(product => product.status === 'Activo')
    .map((product) => ({
      url: `${baseUrl}/product/${product.id}`,
      lastModified: new Date().toISOString(),
    }));

  return [...staticRoutes, ...productRoutes];
}
