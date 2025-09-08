

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Product, Subcategory, Discount, Category, Brand } from '@/types';
import ProductGrid from '@/components/products/ProductGrid';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { calculateDiscountedPrice } from '@/lib/utils';
import { Button } from '../ui/button';
import { SearchX } from 'lucide-react';
import Link from 'next/link';

interface TiendaPageClientProps {
  allProducts: Product[];
  allSubcategories: Subcategory[];
  allCategories: Category[];
  activeDiscounts: Discount[];
  allBrands: Brand[];
  pageType?: 'tienda' | 'ofertas';
}

const PRODUCTS_PER_PAGE = 12;

// Helper function to normalize strings for accent-insensitive search
const normalizeString = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export default function TiendaPageClient({
  allProducts,
  allSubcategories,
  allCategories,
  activeDiscounts,
  allBrands,
  pageType = 'tienda',
}: TiendaPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const categoryQuery = searchParams.get('category') || 'all';
  const subcategoryQuery = searchParams.get('subcategory') || 'all';
  const pageQuery = searchParams.get('page') || '1';
  const sortQuery = searchParams.get('sort') || 'relevance';
  const priceQuery = searchParams.get('price');
  const inStockQuery = searchParams.get('inStock');
  const onDemandQuery = searchParams.get('onDemand');

  const currentPage = useMemo(() => parseInt(pageQuery, 10) || 1, [pageQuery]);

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 100;
    return Math.ceil(Math.max(...allProducts.map(p => p.price)) / 10) * 10
  }, [allProducts]);

  const priceRange = useMemo<[number, number]>(() => {
    if (!priceQuery) return [0, maxPrice];
    const [min, max] = priceQuery.split('-').map(Number);
    return [isNaN(min) ? 0 : min, isNaN(max) ? maxPrice : max];
  }, [priceQuery, maxPrice]);

  const availability = useMemo(() => ({
    inStock: inStockQuery !== 'false',
    onDemand: onDemandQuery !== 'false',
  }), [inStockQuery, onDemandQuery]);
  
  const [localPriceRange, setLocalPriceRange] = useState(priceRange);
  useEffect(() => {
    setLocalPriceRange(priceRange);
  }, [priceRange]);
  
  const updateFilters = useCallback((newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all' || value === 'relevance') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    // Reset page to 1 when filters change, except for pagination itself
    if (!('page' in newParams)) {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const handleAvailabilityChange = (key: 'inStock' | 'onDemand', checked: boolean) => {
    updateFilters({ [key]: checked ? null : 'false' });
  };
  
  const handlePriceCommit = (value: [number, number]) => {
      const newValue = `${value[0]}-${value[1]}`;
      if (value[0] === 0 && value[1] === maxPrice) {
          updateFilters({ price: null });
      } else {
          updateFilters({ price: newValue });
      }
  };

  const { filteredAndSortedProducts, categoryNotFound } = useMemo(() => {
    const subcategoryToCategoryMap = new Map<string, Category>();
    allSubcategories.forEach(sub => {
      const category = allCategories.find(c => c.id === sub.categoryId);
      if (category) {
        subcategoryToCategoryMap.set(sub.id, category);
      }
    });
    
    // First, map products to include their effective price
    const productsWithPrice = allProducts.map(p => {
        const discountInfo = calculateDiscountedPrice(p, activeDiscounts);
        return {
            ...p,
            effectivePrice: discountInfo ? discountInfo.finalPrice : p.price
        };
    });

    let filtered = productsWithPrice;
    let notFound = false;
    
    const normalizedSearchTerm = normalizeString(searchQuery);

    if (searchQuery) {
      filtered = filtered.filter(p =>
        normalizeString(p.name).includes(normalizedSearchTerm) ||
        normalizeString(p.description).includes(normalizedSearchTerm)
      );
    }

    if (categoryQuery !== 'all') {
      const categoryExists = allCategories.some(c => c.name === categoryQuery);
      if (!categoryExists) {
          notFound = true;
      } else {
         filtered = filtered.filter(p => {
            const category = subcategoryToCategoryMap.get(p.subcategoryId);
            return category?.name === categoryQuery;
          });
      }
    }

    if (subcategoryQuery !== 'all' && !notFound) {
      const subcategoryExists = allSubcategories.some(s => s.name === subcategoryQuery);
       if (!subcategoryExists) {
          notFound = true;
      } else {
        filtered = filtered.filter(p => {
            const subcategory = allSubcategories.find(s => s.id === p.subcategoryId);
            return subcategory?.name === subcategoryQuery;
        });
      }
    }

    if(notFound) {
        return { filteredAndSortedProducts: [], categoryNotFound: true };
    }

    filtered = filtered.filter(p => p.effectivePrice >= priceRange[0] && p.effectivePrice <= priceRange[1]);

    filtered = filtered.filter(p => {
      const isStockItem = p.saleType === 'stock';
      const isOnDemandItem = p.saleType === 'on_demand';
      const showStock = availability.inStock && isStockItem;
      const showOnDemand = availability.onDemand && isOnDemandItem;
      return showStock || showOnDemand;
    });

    const sorted = [...filtered];
    switch (sortQuery) {
      case 'price_asc':
        sorted.sort((a, b) => a.effectivePrice - b.effectivePrice);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.effectivePrice - a.effectivePrice);
        break;
      case 'rating_desc':
        sorted.sort((a, b) => {
          const ratingA = a.reviews.length > 0 ? a.reviews.reduce((acc, r) => acc + r.rating, 0) / a.reviews.length : 0;
          const ratingB = b.reviews.length > 0 ? b.reviews.reduce((acc, r) => acc + r.rating, 0) / b.reviews.length : 0;
          return ratingB - ratingA;
        });
        break;
      case 'relevance':
      default:
        break;
    }

    return { filteredAndSortedProducts: sorted, categoryNotFound: notFound };
  }, [searchQuery, categoryQuery, subcategoryQuery, priceRange, sortQuery, allProducts, allSubcategories, allCategories, availability, activeDiscounts]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => filteredAndSortedProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  ), [filteredAndSortedProducts, currentPage]);

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const pageTitle = useMemo(() => {
    if (categoryNotFound) return 'Categoría no encontrada';
    if (pageType === 'ofertas') return 'Ofertas Especiales';
    if (categoryQuery !== 'all') return categoryQuery;
    if (subcategoryQuery !== 'all') return subcategoryQuery;
    if (searchQuery) return `Resultados para "${searchQuery}"`;
    return 'Nuestra Tienda';
  }, [pageType, categoryQuery, subcategoryQuery, searchQuery, categoryNotFound]);

  const pageDescription = useMemo(() => {
      if (categoryNotFound) return 'La categoría que buscas no existe o no está disponible.';
      if (pageType === 'ofertas') return 'Aprovecha nuestros descuentos y promociones especiales.';
      if (searchQuery) return `Se encontraron ${filteredAndSortedProducts.length} productos.`;
      return 'Explora todos nuestros productos.';
  }, [pageType, searchQuery, filteredAndSortedProducts.length, categoryNotFound]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    const ellipsis = <PaginationItem key="ellipsis"><PaginationEllipsis /></PaginationItem>;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <PaginationItem key={i}>
            <PaginationLink href={createPageURL(i)} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      pageNumbers.push(
        <PaginationItem key={1}>
          <PaginationLink href={createPageURL(1)} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        pageNumbers.push(React.cloneElement(ellipsis, {key: 'start-ellipsis'}));
      }
      
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
          <PaginationItem key={i}>
            <PaginationLink href={createPageURL(i)} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      
      if (currentPage < totalPages - 2) {
        pageNumbers.push(React.cloneElement(ellipsis, {key: 'end-ellipsis'}));
      }
      
      pageNumbers.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href={createPageURL(totalPages)} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pageNumbers;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8">
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
            {pageDescription}
            </p>
        </section>

        {!categoryNotFound && (
            <div className="mb-8 border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Filtros y Ordenación</h3>
                <p className="text-sm text-muted-foreground">
                {filteredAndSortedProducts.length} resultados
                </p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Price Filter */}
                <div>
                <Label className="text-base font-semibold">Rango de precios</Label>
                <div className="flex justify-between text-sm pt-2">
                    <span>${localPriceRange[0]}</span>
                    <span>${localPriceRange[1]}</span>
                </div>
                <Slider
                    min={0}
                    max={maxPrice}
                    step={1}
                    value={localPriceRange}
                    onValueChange={setLocalPriceRange}
                    onValueCommit={handlePriceCommit}
                    className="mt-2"
                />
                </div>

                {/* Availability Filter */}
                <div>
                <Label className="text-base font-semibold">Disponibilidad</Label>
                <div className="space-y-2 pt-3">
                    <div className="flex items-center space-x-2">
                    <Checkbox id="filter-inStock" checked={availability.inStock} onCheckedChange={(checked) => handleAvailabilityChange('inStock', checked as boolean)} />
                    <Label htmlFor="filter-inStock" className="text-sm font-normal">En Stock</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                    <Checkbox id="filter-onDemand" checked={availability.onDemand} onCheckedChange={(checked) => handleAvailabilityChange('onDemand', checked as boolean)} />
                    <Label htmlFor="filter-onDemand" className="text-sm font-normal">Bajo Pedido</Label>
                    </div>
                </div>
                </div>

                {/* Sort Order */}
                <div>
                <Label className="text-base font-semibold">Ordenar por</Label>
                <Select value={sortQuery} onValueChange={(value) => updateFilters({ sort: value })}>
                    <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="relevance">Relevancia</SelectItem>
                    <SelectItem value="price_asc">Precio: Bajo a Alto</SelectItem>
                    <SelectItem value="price_desc">Precio: Alto a Bajo</SelectItem>
                    <SelectItem value="rating_desc">Mejor Valorados</SelectItem>
                    </SelectContent>
                </Select>
                </div>
            </div>
            </div>
        )}

        <main>
            {filteredAndSortedProducts.length > 0 ? (
            <>
                <ProductGrid products={paginatedProducts} activeDiscounts={activeDiscounts} allBrands={allBrands} />
                <Pagination>
                    <PaginationContent>
                    {currentPage > 1 && (
                        <PaginationItem>
                        <PaginationPrevious href={createPageURL(currentPage - 1)} />
                        </PaginationItem>
                    )}
                    {renderPagination()}
                    {currentPage < totalPages && (
                        <PaginationItem>
                            <PaginationNext href={createPageURL(currentPage + 1)} />
                        </PaginationItem>
                    )}
                    </PaginationContent>
                </Pagination>
            </>
            ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
                 <h3 className="mt-4 text-xl font-semibold">
                    {categoryNotFound ? 'Categoría no encontrada' : 'No se encontraron productos'}
                </h3>
                <p className="mt-2 text-muted-foreground">
                    {categoryNotFound ? 'La categoría que buscas no existe o fue desactivada.' : 'Intenta ajustar tu búsqueda o filtros.'}
                </p>
                <Button asChild className="mt-6">
                    <Link href="/tienda">Volver a la tienda</Link>
                </Button>
            </div>
            )}
        </main>
    </div>
  );
}
