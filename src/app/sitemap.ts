import { getProductsFromDb } from '@/lib/data/products';
import { getStoreConfigFromDb } from '@/lib/data/store';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const storeConfig = await getStoreConfigFromDb();
  const baseUrl = storeConfig.baseUrl;

  // Rutas estáticas
  const staticRoutes = [
    '',
    '/tienda',
    '/ofertas',
    '/nosotros',
    '/contacto',
    '/sorteos',
    '/torneos/liga',
    '/torneos/grupos',
    '/torneos/eliminatoria',
    '/login',
    '/register',
    '/privacidad',
    '/terminos',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
  }));

  // Rutas dinámicas de productos
  const products = await getProductsFromDb();
  const productRoutes = products
    .filter(product => product.status === 'Activo')
    .map((product) => ({
      url: `${baseUrl}/product/${product.id}`,
      lastModified: new Date().toISOString(),
    }));

  return [...staticRoutes, ...productRoutes];
}
