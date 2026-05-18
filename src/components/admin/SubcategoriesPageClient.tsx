
'use client';

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Pencil, Archive, ArchiveRestore, ListTree, FileDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subcategory, Category, StoreConfig } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from "next/navigation";
import { addSubcategoryAction, updateSubcategoryAction, getStoreConfigAction } from "@/lib/actions";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

const subcategorySchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  categoryId: z.string().min(1, "Debes seleccionar una categoría padre."),
});

type SubcategoryFormValues = z.infer<typeof subcategorySchema>;

interface SubcategoriesPageClientProps {
    initialSubcategories: Subcategory[];
    allCategories: Category[];
}

export default function SubcategoriesPageClient({ initialSubcategories, allCategories }: SubcategoriesPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>(initialSubcategories);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
    const [subcategoryToToggle, setSubcategoryToToggle] = useState<Subcategory | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("active");
    const [currentPage, setCurrentPage] = useState(1);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

    useEffect(() => { 
        setAllSubcategories(initialSubcategories);
    }, [initialSubcategories]);

    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, activeTab]);

    const filteredSubcategories = useMemo(() => {
        return allSubcategories.filter(subcategory => {
            const searchMatch = subcategory.name.toLowerCase().includes(searchTerm.toLowerCase());
            const categoryMatch = categoryFilter === 'all' || subcategory.categoryId === categoryFilter;
            const statusMatch = (activeTab === 'active' ? subcategory.status === 'Activo' : subcategory.status === 'Inactivo');
            return searchMatch && categoryMatch && statusMatch;
        });
    }, [allSubcategories, searchTerm, categoryFilter, activeTab]);
    
    const totalPages = Math.ceil(filteredSubcategories.length / ITEMS_PER_PAGE);
    const paginatedSubcategories = useMemo(() => filteredSubcategories.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredSubcategories, currentPage]);

    const form = useForm<SubcategoryFormValues>({
      resolver: zodResolver(subcategorySchema),
      defaultValues: { name: "", categoryId: "" },
    });

    useEffect(() => {
      if (editingSubcategory) {
        form.reset(editingSubcategory);
      } else {
        form.reset({ name: "", categoryId: "" });
      }
    }, [editingSubcategory, form]);

    const getCategoryName = (categoryId: string) => {
      return allCategories.find(c => c.id === categoryId)?.name || 'Desconocida';
    };
    
    const handleCreate = () => {
      setEditingSubcategory(null);
      setIsDialogOpen(true);
    };
    
    const handleEdit = (subcategory: Subcategory) => {
      setEditingSubcategory(subcategory);
      setIsDialogOpen(true);
    };

    const handleToggleStatus = (subcategory: Subcategory) => {
      setSubcategoryToToggle(subcategory);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!subcategoryToToggle) return;
      
      const newStatus = subcategoryToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
      const result = await updateSubcategoryAction({ ...subcategoryToToggle, status: newStatus });
      
      if (result.success) {
        toast({ title: `Subcategoría ${newStatus === 'Activo' ? 'activada' : 'desactivada'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }

      setSubcategoryToToggle(null);
      setIsConfirmOpen(false);
    };

    const onSubmit = async (data: SubcategoryFormValues) => {
      const result = editingSubcategory ?
        await updateSubcategoryAction({ ...editingSubcategory, ...data }) :
        await addSubcategoryAction(data);

      if (result.success) {
        toast({ title: editingSubcategory ? "Subcategoría actualizada" : "Subcategoría creada" });
        router.refresh();
        setIsDialogOpen(false);
        setEditingSubcategory(null);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    };

    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredSubcategories.map(s => [
            s.name,
            getCategoryName(s.categoryId),
            s.status,
        ]);
        const tableHeaders = ["Nombre", "Categoría Padre", "Estado"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Subcategorías", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 40);

        autoTable(doc, {
            startY: 50,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 22, 22] },
            styles: { font: 'helvetica', fontSize: 8 },
        });

        doc.save(`reporte_subcategorias_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    
    const renderTable = (subcategoriesToRender: Subcategory[]) => (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría Padre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subcategoriesToRender.map((subcategory) => (
                        <TableRow key={subcategory.id}>
                            <TableCell className="font-medium">{subcategory.name}</TableCell>
                            <TableCell><Badge variant="secondary">{getCategoryName(subcategory.categoryId)}</Badge></TableCell>
                            <TableCell><Badge variant={subcategory.status === 'Activo' ? 'default' : 'secondary'}>{subcategory.status}</Badge></TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(subcategory)}>
                                          <Pencil className="mr-2 h-4 w-4"/> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(subcategory)}>
                                            {subcategory.status === 'Activo' ? 
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
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-6">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{paginatedSubcategories.length}</strong> de <strong>{filteredSubcategories.length}</strong> subcategorías.
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
                        <ListTree className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Subcategorías</h1>
                        <p className="text-muted-foreground">Gestiona las subcategorías dentro de cada categoría principal.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Subcategoría
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
                                <SelectValue placeholder="Filtrar por categoría padre" />
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
                            <TabsTrigger value="active">Activas</TabsTrigger>
                            <TabsTrigger value="inactive">Inactivas</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            {renderTable(paginatedSubcategories)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedSubcategories)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingSubcategory ? "Editar" : "Crear"} Subcategoría</DialogTitle>
                  <DialogDescription>
                    {editingSubcategory ? "Modifica los detalles de la subcategoría." : "Añade una nueva subcategoría a tu tienda."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría Padre</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">Guardar</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescriptionComponent>
                    Vas a {subcategoryToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} la subcategoría &quot;{subcategoryToToggle?.name}&quot;.
                  </AlertDialogDescriptionComponent>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmToggleStatus}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
