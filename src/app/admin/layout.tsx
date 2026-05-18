
/**
 * @fileoverview Layout principal para todas las páginas del panel de administración.
 * Este layout gestiona la autenticación, la estructura de la barra lateral (sidebar)
 * y el contenido principal. Se encarga de proteger las rutas de administración y
 * de mostrar solo las secciones a las que el usuario tiene acceso según su rol.
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarInset, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { Home, Package, LayoutGrid, ListTree, Tag, Ticket, Users, Star, History, ClipboardList, Store, Gift, Info, Tablet, ShieldAlert, Boxes, Database, Award, UploadCloud, FileClock, UserCog, ChevronDown, Archive, Sun, Moon, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StoreConfig } from '@/types';
import { getStoreConfigAction } from '@/lib/actions/store';
import AdminBreadcrumbs from '@/components/admin/AdminBreadcrumbs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';

// Definición de las secciones y sus permisos requeridos
const navItems: Array<any> = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Home, permission: 'view_dashboard' },
    { href: '/admin/pos', label: 'Punto de Venta', icon: Tablet, permission: 'manage_pos' },
    { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, permission: 'manage_orders' },
    { href: '/admin/productos', label: 'Productos', icon: Package, permission: 'manage_products' },
    { href: '/admin/inventario', label: 'Añadir Stock', icon: Boxes, permission: 'manage_inventory' },
    { href: '/admin/importar-exportar', label: 'Importar/Exportar', icon: UploadCloud, permission: 'manage_import_export' },
    { href: '/admin/categorias', label: 'Categorías', icon: LayoutGrid, permission: 'manage_categories' },
    { href: '/admin/subcategorias', label: 'Subcategorías', icon: ListTree, permission: 'manage_categories' },
    { href: '/admin/marcas', label: 'Marcas', icon: Award, permission: 'manage_categories' },
    { href: '/admin/descuentos', label: 'Descuentos', icon: Tag, permission: 'manage_discounts' },
    { href: '/admin/cupones', label: 'Cupones', icon: Ticket, permission: 'manage_discounts' },
    { href: '/admin/sorteos', label: 'Sorteos', icon: Gift, permission: 'manage_giveaways' },
    { href: '/admin/usuarios', label: 'Usuarios', icon: Users, permission: 'manage_users' },
    { href: '/admin/roles', label: 'Roles y Permisos', icon: UserCog, permission: 'manage_roles' },
    { href: '/admin/resenas', label: 'Reseñas', icon: Star, permission: 'manage_reviews' },
    { href: '/admin/sugerencias', label: 'Sugerencias', icon: Lightbulb, permission: 'view_dashboard' }, // Assuming view_dashboard permission
    { href: '/admin/kardex', label: 'Kardex', icon: History, permission: 'view_kardex' },
    { href: '/admin/actividad', label: 'Actividad', icon: FileClock, permission: 'view_activity' },
    { href: '/admin/backup', label: 'Backup', icon: Database, permission: 'manage_backups' },
    { href: '/admin/tienda', label: 'Tienda', icon: Store, permission: 'manage_store_settings' },
    { href: '/admin/nosotros', label: 'Nosotros', icon: Info, permission: 'manage_store_settings' },
];

/**
 * Componente interno que renderiza el layout del administrador.
 * Maneja la lógica de estado y efectos.
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - El contenido de la página a renderizar.
 * @returns {JSX.Element} El layout del administrador.
 */
function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
    const { setTheme, resolvedTheme } = useTheme();

    useEffect(() => {
        getStoreConfigAction().then(result => {
            if (result.success) {
                setStoreConfig(result.config);
            }
        });
    }, []);

    if (loading) {
        return <div className="flex h-dvh items-center justify-center">Verificando acceso...</div>;
    }

    if (!user || user.role === 'user') {
        return (
            <div className="flex h-dvh items-center justify-center bg-muted p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <CardTitle className="mt-4">Acceso Denegado</CardTitle>
                        <CardDescription>
                            No tienes los permisos necesarios para ver esta página. Esta sección es solo para administradores.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/">Volver a la Tienda</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Filtra los items de navegación basados en los permisos del usuario
    const visibleNavItems = navItems.filter(item => 
      user.permissions?.all || (item.permission && user.permissions?.[item.permission])
    );
    
    // Verifica si el usuario tiene permiso para la ruta actual
    const currentTopLevelItem = navItems.find(item => item.href ? pathname.startsWith(item.href) : (item.subItems && item.subItems.some((sub: any) => pathname.startsWith(sub.href))));
    const hasAccessToCurrentPage = user.permissions?.all || (currentTopLevelItem?.permission && user.permissions?.[currentTopLevelItem.permission]);


    if (!hasAccessToCurrentPage) {
        return (
             <div className="flex h-dvh items-center justify-center bg-muted p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <CardTitle className="mt-4">Acceso Denegado</CardTitle>
                        <CardDescription>
                           Tu rol no tiene permisos para acceder a esta sección.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/admin/dashboard">Ir al Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const Brand = () => {
        if (!storeConfig) {
            return <span>Cargando...</span>;
        }
        const logoToDisplay = resolvedTheme === 'dark' ? storeConfig.logoUrlDark : storeConfig.logoUrl;
        return (
             <Link href="/" className="flex items-center gap-2 font-bold font-headline text-lg text-foreground">
                 {logoToDisplay ? (
                    <Image src={logoToDisplay} alt={`${storeConfig.name} logo`} width={32} height={32} className="h-8 w-auto object-contain" />
                 ) : null}
                <span>{storeConfig.name}</span>
                <span className="text-xs font-normal bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Admin</span>
            </Link>
        )
    };
  
    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <Brand />
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                         {visibleNavItems.map((item) => (
                            item.subItems ? (
                                <Collapsible key={item.label} defaultOpen={item.subItems.some((sub: any) => pathname.startsWith(sub.href))}>
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton tooltip={item.label} className="justify-between">
                                                <div className="flex items-center gap-2">
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.label}</span>
                                                </div>
                                                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                    </SidebarMenuItem>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.subItems.map((subItem: any) => (
                                                <SidebarMenuSubItem key={subItem.href}>
                                                    <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                                                        <Link href={subItem.href}>
                                                            <span>{subItem.label}</span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </Collapsible>
                            ) : (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild tooltip={item.label} isActive={item.href ? pathname.startsWith(item.href) : false}>
                                        <Link href={item.href!}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )
                         ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter className='items-center'>
                    <div className="flex items-center gap-2 w-full">
                         <Avatar className="h-8 w-8">
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{user.name}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={logout}>Cerrar Sesión</Button>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <AdminBreadcrumbs />
                    </div>
                    <div>
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                          >
                            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                          </Button>
                    </div>
                </header>
                {children}
                 <Toaster />
            </SidebarInset>
        </SidebarProvider>
    )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
