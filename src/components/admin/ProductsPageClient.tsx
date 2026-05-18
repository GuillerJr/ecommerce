

'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { PlusCircle, MoreHorizontal, Pencil, Archive, ArchiveRestore, Package, FileDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Product, Category, Subcategory, Brand, StoreConfig } from "@/types";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateProductAction, getStoreConfigAction } from "@/lib/actions";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from "@/contexts/AuthContext";

const ProductForm = dynamic(() => import('@/components/admin/ProductForm'), {
    loading: () => (
        <div className="space-y-4 p-1">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    ),
    ssr: false
});

const ITEMS_PER_PAGE = 10;

// Helper function to normalize strings for accent-insensitive search
const normalizeString = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

interface ProductsPageClientProps {
    initialProducts: Product[];
    allCategories: Category[];
    allSubcategories: Subcategory[];
    allBrands: Brand[];
}

export default function ProductsPageClient({ initialProducts, allCategories, allSubcategories, allBrands }: ProductsPageClientProps) {
    const router = useRouter();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [productToToggle, setProductToToggle] = useState<Product | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("active");
    const [currentPage, setCurrentPage] = useState(1);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    const subIdToCategoryMap = useMemo(() => {
        const map = new Map<string, Category>();
        const categoryMap = new Map(allCategories.map(c => [c.id, c]));
        for (const sub of allSubcategories) {
            const cat = categoryMap.get(sub.categoryId);
            if (cat) map.set(sub.id, cat);
        }
        return map;
    }, [allCategories, allSubcategories]);

    const getCategoryNameForProduct = useCallback((product: Product) => {
        return subIdToCategoryMap.get(product.subcategoryId)?.name || 'N/A';
    }, [subIdToCategoryMap]);

    useEffect(() => { 
      setCurrentPage(1); 
    }, [searchTerm, categoryFilter, activeTab]);

    const filteredProducts = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);
        return initialProducts.filter(product => {
            const searchMatch = normalizedSearchTerm === '' || normalizeString(product.name).includes(normalizedSearchTerm);
            const category = subIdToCategoryMap.get(product.subcategoryId);
            const categoryMatch = categoryFilter === 'all' || (category && category.id === categoryFilter);
            const statusMatch = (activeTab === 'active' ? product.status === 'Activo' : product.status === 'Inactivo');
            return searchMatch && categoryMatch && statusMatch;
        });
    }, [initialProducts, searchTerm, categoryFilter, activeTab, subIdToCategoryMap]);
    
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredProducts, currentPage]);

    const handleCreate = () => {
        setEditingProduct(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    };

    const handleToggleStatus = (product: Product) => {
      setProductToToggle(product);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!productToToggle) return;
      
      const newStatus = productToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
      const result = await updateProductAction({ ...productToToggle, status: newStatus });

      if (result.success) {
        toast({ title: `Producto ${newStatus === 'Activo' ? 'activado' : 'desactivado'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message || 'No se pudo cambiar el estado del producto.', variant: "destructive" });
      }
      setIsConfirmOpen(false);
      setProductToToggle(null);
    };
    
    const handleFormSubmit = () => {
        router.refresh();
        setIsDialogOpen(false);
        setEditingProduct(null);
    };

    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredProducts.map(p => [
            p.name,
            getCategoryNameForProduct(p),
            `$${p.price.toFixed(2)}`,
            p.saleType === 'stock' ? p.stock.toString() : 'Bajo Pedido',
            p.status,
        ]);
        const tableHeaders = ["Nombre", "Categoría", "Precio", "Inventario", "Estado"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Productos", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        const categoryFilterName = categoryFilter === 'all' ? 'Todas' : allCategories.find(c => c.id === categoryFilter)?.name;
        const filtersApplied = `Búsqueda: "${searchTerm || 'Ninguna'}", Categoría: "${categoryFilterName}", Pestaña: "${activeTab === 'active' ? 'Activos' : 'Inactivos'}"`;
        doc.text(`Filtros Aplicados: ${filtersApplied}`, 14, 40);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 44);

        autoTable(doc, {
            startY: 50,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 22, 22] },
            styles: {
                font: 'helvetica',
                fontSize: 8,
            },
        });

        doc.save(`reporte_productos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const renderTable = (productsToRender: Product[]) => (
        <>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px] hidden sm:table-cell">Imagen</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Inventario</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {productsToRender.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="hidden sm:table-cell">
                                    <Image
                                        alt={product.name}
                                        className="aspect-square rounded-md object-contain p-1 bg-secondary/50"
                                        height="64"
                                        src={product.image}
                                        width="64"
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell><Badge variant="outline">{getCategoryNameForProduct(product)}</Badge></TableCell>
                                <TableCell>${product.price.toFixed(2)}</TableCell>
                                <TableCell>
                                    {product.saleType === 'stock' ? (
                                        <Badge
                                            variant="outline"
                                            className={cn({
                                                "text-green-700 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-700 dark:bg-green-950": product.stock > 5,
                                                "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:bg-amber-950": product.stock > 0 && product.stock <= 5,
                                                "text-red-700 border-red-200 bg-red-50 dark:text-red-300 dark:border-red-700 dark:bg-red-950": product.stock === 0,
                                            })}
                                        >
                                            {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Bajo Pedido</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={product.status === 'Activo' ? 'default' : 'secondary'}>{product.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                                              <Pencil className="mr-2 h-4 w-4"/> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                                                {product.status === 'Activo' ? 
                                                    <><Archive className="mr-2 h-4 w-4"/> Desactivar</> : 
                                                    <><ArchiveRestore className="mr-2 h-4 w-4"/> Activar</>
                                                }
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-6">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{paginatedProducts.length}</strong> de <strong>{filteredProducts.length}</strong> productos.
                    </div>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                            </PaginationItem>
                            <PaginationItem>
                                <span className="text-sm font-medium mx-2">
                                    Página {currentPage} de {totalPages}
                                </span>
                            </PaginationItem>
                            <PaginationItem>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Siguiente</Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </>
    );

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-secondary p-3 rounded-full border">
                        <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Productos</h1>
                        <p className="text-muted-foreground">Gestiona todos los productos de tu tienda.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Producto
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Input 
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="sm:w-[250px]">
                                <SelectValue placeholder="Filtrar por categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las categorías</SelectItem>
                                {allCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="active">Activos</TabsTrigger>
                            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            {renderTable(paginatedProducts)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedProducts)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) setEditingProduct(null);
                setIsDialogOpen(isOpen);
            }}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
                    <DialogDescription>
                      {editingProduct ? 'Modifica la información del producto.' : 'Rellena la información para el nuevo producto.'}
                    </DialogDescription>
                  </DialogHeader>
                  <ProductForm 
                    product={editingProduct}
                    onFormSubmit={handleFormSubmit}
                    categories={allCategories}
                    subcategories={allSubcategories}
                    allBrands={allBrands}
                  />
              </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vas a {productToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} el producto &quot;{productToToggle?.name}&quot;.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmToggleStatus}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
