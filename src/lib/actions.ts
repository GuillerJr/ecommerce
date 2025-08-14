
/**
 * @fileoverview Archivo central de acciones del servidor para la aplicación.
 * Este archivo ha sido refactorizado para importar y re-exportar acciones
 * desde módulos más pequeños y específicos por dominio, ubicados en la carpeta `actions`.
 * Esto mejora la organización y mantenibilidad del código.
 */

// Exportaciones de acciones de autenticación
export * from './actions/auth';
// Exportaciones de acciones de productos
export * from './actions/products';
// Exportaciones de acciones de categorías
export * from './actions/categories';
// Exportaciones de acciones de marcas
export * from './actions/brands';
// Exportaciones de acciones de descuentos
export * from './actions/discounts';
// Exportaciones de acciones de cupones
export * from './actions/coupons';
// Exportaciones de acciones de pedidos
export * from './actions/orders';
// Exportaciones de acciones de usuarios
export * from './actions/users';
// Exportaciones de acciones de reseñas
export * from './actions/reviews';
// Exportaciones de acciones de sorteos
export * from './actions/giveaways';
// Exportaciones de acciones de torneos
export * from './actions/tournaments';
// Exportaciones de acciones de la tienda
export * from './actions/store';
// Exportaciones de acciones de la página "Nosotros"
export * from './actions/nosotros';
// Exportaciones de acciones de backups
export * from './actions/backups';
// Exportaciones de acciones de roles
export * from './actions/roles';
// Exportaciones de acciones de navegación (breadcrumbs)
export * from './actions/navigation';
// Exportaciones de acciones de contacto
export * from './actions/contact';
// Exportaciones de acciones de PayPal
export * from './actions/paypal';
