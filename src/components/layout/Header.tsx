

'use client';

import { ShoppingCart, Menu, User, Home, Store, Users, Mail, Search, LayoutDashboard, Settings, Package, LogOut, LogIn, Sun, Moon, GitCompareArrows, Globe, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CartSheet from '@/components/cart/CartSheet';
import { useCart } from '@/contexts/CartContext';
import * as React from 'react';
import { useTheme } from "next-themes";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { getCategoriesAndSubcategoriesAction } from '@/lib/actions/categories';
import type { FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, Subcategory, StoreConfig } from '@/types';
import Image from 'next/image';
import { useComparison } from '@/contexts/ComparisonContext';
import { Badge } from '../ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { updateSearchParams } from '@/lib/utils';

export default function Header({ storeConfig }: { storeConfig: StoreConfig }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartCount } = useCart();
  const { comparisonIds } = useComparison();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchCategory, setSearchCategory] = React.useState('all');

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [subcategories, setSubcategories] = React.useState<Subcategory[]>([]);

  React.useEffect(() => {
    getCategoriesAndSubcategoriesAction().then(result => {
        if(result.success && result.categories && result.subcategories) {
            setCategories(result.categories.filter((c: Category) => c.status === 'Activo'));
            setSubcategories(result.subcategories.filter((s: Subcategory) => s.status === 'Activo'));
        }
    })
  }, []);
  
  // Sincronizar el estado local con los parámetros de la URL solo al montar
  React.useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setSearchCategory(searchParams.get('category') || 'all');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const categoriesWithSubcategories = React.useMemo(() => {
    if (!categories || !subcategories) return [];
    return categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.categoryId === cat.id)
    }));
  }, [categories, subcategories]);

  const { user, logout } = useAuth();
  
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newUrl = updateSearchParams(searchParams, {
        q: searchQuery,
        category: searchCategory,
    });
    router.push(`/tienda?${newUrl}`);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const mainNavLinks = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/tienda', label: 'Tienda', icon: Store },
    { href: '/nosotros',label: 'Nosotros', icon: Users },
    { href: '/contacto', label: 'Contacto', icon: Mail },
    { href: '/sugerencias', label: 'Sugerencias', icon: Lightbulb },
  ];

  const bottomNavLinks = [
      { href: '/ofertas', label: 'Ofertas' },
      { href: '/tienda', label: 'Tienda' },
      { href: '/nosotros', label: 'Nosotros' },
      { href: '/contacto', label: 'Contacto' },
      { href: '/sugerencias', label: 'Sugerencias' },
  ];
  
  const BrandLogo = () => {
    return (
        <div className="flex items-center gap-2">
            {storeConfig.logoUrl && (
                <Image src={storeConfig.logoUrl} alt={`${storeConfig.name} logo`} width={32} height={32} className="h-8 w-auto object-contain dark:hidden" />
            )}
            {storeConfig.logoUrlDark && (
                <Image src={storeConfig.logoUrlDark} alt={`${storeConfig.name} logo`} width={32} height={32} className="h-8 w-auto object-contain hidden dark:block" />
            )}
            <span className="font-bold font-headline text-lg text-foreground">{storeConfig.name}</span>
        </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full text-sm border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar */}
      <div className="bg-white dark:bg-black text-black dark:text-white">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link href="/" className="flex items-center p-1 -ml-2">
            <BrandLogo />
          </Link>

          <div className="hidden md:flex flex-1">
             <form className="w-full max-w-xl mx-auto flex items-center group rounded-md bg-muted/50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all" onSubmit={handleSearchSubmit}>
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger className="w-[150px] rounded-l-md border-0 bg-transparent shadow-none focus:ring-0">
                    <SelectValue placeholder="Categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                 <Separator orientation="vertical" className="h-6 bg-border" />
                <div className="relative flex-1">
                    <Input
                        type="search"
                        placeholder="Buscar..."
                        className="h-10 w-full border-0 bg-transparent shadow-none focus-visible:ring-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                 <Button type="submit" size="icon" className="h-10 w-10 shrink-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-primary">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">Buscar</span>
                </Button>
            </form>
          </div>

          <div className="flex items-center gap-1">
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              {comparisonIds.length > 0 && (
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" asChild>
                    <Link href="/compare">
                        <GitCompareArrows className="h-5 w-5" />
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{comparisonIds.length}</Badge>
                    </Link>
                </Button>
              )}
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="flex-col items-start leading-tight p-2 border border-transparent h-auto text-current hover:text-current/80">
                  <span className="text-xs">{user ? `Hola, ${user.name.split(' ')[0]}` : 'Hola, Identifícate'}</span>
                  <span className="font-bold text-sm">Cuenta y Listas</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     {user.role !== 'user' && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/dashboard" className="flex items-center gap-2">
                            <LayoutDashboard />
                            <span>Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/perfil" className="flex items-center gap-2">
                        <User />
                        <span>Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/pedidos" className="flex items-center gap-2">
                        <Package />
                        <span>Pedidos</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/configuracion" className="flex items-center gap-2">
                        <Settings />
                        <span>Configuración</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="flex items-center gap-2 cursor-pointer">
                      <LogOut />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="flex items-center gap-2">
                      <LogIn />
                      <span>Iniciar Sesión</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

             <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" className="p-2 h-auto text-current hover:bg-accent hover:text-accent-foreground rounded-md flex items-center gap-2">
                        <div className="relative">
                            <ShoppingCart className="h-8 w-8" />
                            {cartCount > 0 && (
                                <Badge 
                                  variant="destructive" 
                                  className="absolute top-0 right-0 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full transform translate-x-1/2 -translate-y-1/2"
                                >
                                    {cartCount}
                                </Badge>
                            )}
                        </div>
                        <span className="font-bold text-sm hidden lg:block">Carrito</span>
                    </Button>
                </SheetTrigger>
                <CartSheet storeConfig={storeConfig} setSheetOpen={setIsCartOpen} />
            </Sheet>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto flex h-10 items-center justify-between gap-2 px-4">
             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" className="p-2 border border-transparent hover:border-white/50 rounded-sm text-primary-foreground font-bold">
                        <Menu className="h-5 w-5 mr-1" />
                        Todo
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full max-w-sm overflow-y-auto p-0">
                    <SheetHeader className="bg-secondary p-4">
                       <SheetTitle>
                           {user ? (
                                <Link href="/perfil" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <span className="text-xl text-foreground font-semibold">Hola, {user.name.split(' ')[0]}</span>
                                </Link>
                           ) : (
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <span className="text-xl text-foreground font-semibold">Hola, Identifícate</span>
                                </Link>
                           )}
                       </SheetTitle>
                    </SheetHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <h3 className="px-4 text-lg font-semibold mb-2 text-foreground">Navegación</h3>
                            <div className="flex flex-col gap-1">
                                {mainNavLinks.map((link) => (
                                    <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} 
                                          className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-accent text-foreground">
                                        <link.icon className="h-5 w-5 text-muted-foreground" />
                                        <span>{link.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <Separator />
                         <div>
                            <h3 className="px-4 text-lg font-semibold mb-2 text-foreground">Comprar por Categoría</h3>
                            <Accordion type="multiple" className="w-full text-foreground">
                                {categoriesWithSubcategories.map((category) => (
                                    <AccordionItem value={category.name} key={category.name} className="border-b-0">
                                        <div className="flex items-center hover:bg-accent rounded-md mx-2">
                                            <Link 
                                                href={`/tienda?category=${encodeURIComponent(category.name)}`} 
                                                className="hover:no-underline flex-1 text-left px-2 py-2"
                                                onClick={(e) => { router.push(e.currentTarget.href); setIsMobileMenuOpen(false); }}
                                            >
                                                {category.name}
                                            </Link>
                                            <AccordionTrigger className="px-2 py-0 hover:no-underline" />
                                        </div>
                                        <AccordionContent>
                                            <ul className="flex flex-col gap-1 pt-2">
                                                {category.subcategories.map((sub) => (
                                                    <li key={sub.name}>
                                                        <Link 
                                                            href={`/tienda?subcategory=${encodeURIComponent(sub.name)}`}
                                                            className="hover:bg-accent rounded-md pl-12 pr-4 py-2 block"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                        >
                                                            {sub.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <nav className="hidden md:flex items-center gap-2 overflow-x-auto whitespace-nowrap h-full">
                {bottomNavLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="p-2 border border-transparent hover:border-white/50 rounded-sm h-full flex items-center">
                        {link.label}
                    </Link>
                ))}
            </nav>
        </div>
      </div>
      <Alert className="bg-secondary/80 border-0 border-b rounded-none text-center p-2">
          <div className="container mx-auto flex items-center justify-center gap-2">
              <Globe className="h-4 w-4" />
              <AlertDescription className="text-xs font-medium">
                  Tienda disponible por ahora solo para Ecuador. ¡Próximamente más países!
              </AlertDescription>
          </div>
      </Alert>
      
       <div className="bg-muted p-2 md:hidden">
            <form className="w-full flex" onSubmit={handleSearchSubmit}>
                <div className="relative flex-1">
                    <Input 
                        type="search" 
                        placeholder="Buscar..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-4 pr-10 rounded-r-none"
                    />
                </div>
                 <Button type="submit" size="icon" className="rounded-l-none">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">Buscar</span>
                </Button>
            </form>
        </div>
    </header>
  );
}
