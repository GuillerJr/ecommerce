

'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Archive, ArchiveRestore, LayoutGrid, FileDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Category, StoreConfig } from "@/types";
import { useRouter } from "next/navigation";
import { addCategoryAction, updateCategoryAction, getStoreConfigAction } from "@/lib/actions";
import { Icon, iconList, IconName } from "@/lib/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "../ui/badge";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

const categorySchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  description: z.string().min(5, "La descripción es muy corta."),
  iconName: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoriesPageClientProps {
    initialCategories: Category[];
}

export default function CategoriesPageClient({ initialCategories }: CategoriesPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [allCategories, setAllCategories] = useState<Category[]>(initialCategories);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryToToggle, setCategoryToToggle] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState("active");
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

    useEffect(() => { 
        setAllCategories(initialCategories); 
    }, [initialCategories]);

    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);

    const filteredCategories = useMemo(() => {
        return allCategories.filter(category => 
            (activeTab === 'active' ? category.status === 'Activo' : category.status === 'Inactivo') &&
            (category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [allCategories, searchTerm, activeTab]);
    
    const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
    const paginatedCategories = useMemo(() => filteredCategories.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredCategories, currentPage]);

    const form = useForm<CategoryFormValues>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: "", description: "", iconName: "" },
    });

    useEffect(() => {
      if (editingCategory) {
        form.reset({
            ...editingCategory,
            iconName: editingCategory.iconName || "",
        });
      } else {
        form.reset({ name: "", description: "", iconName: "" });
      }
    }, [editingCategory, form]);

    const handleCreate = () => {
      setEditingCategory(null);
      setIsFormOpen(true);
    };
    
    const handleEdit = (category: Category) => {
      setEditingCategory(category);
      setIsFormOpen(true);
    };

    const handleToggleStatus = (category: Category) => {
      setCategoryToToggle(category);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!categoryToToggle) return;
      
      const newStatus = categoryToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
      const result = await updateCategoryAction({ ...categoryToToggle, status: newStatus });
      
      if (result.success) {
        toast({ title: `Categoría ${newStatus === 'Activo' ? 'activada' : 'desactivada'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      
      setCategoryToToggle(null);
      setIsConfirmOpen(false);
    };

    const onSubmit = async (data: CategoryFormValues) => {
      const action = editingCategory 
        ? updateCategoryAction({ ...editingCategory, ...data }) 
        : addCategoryAction({ ...data });

      const result = await action;
      if(result.success) {
        toast({ title: editingCategory ? "Categoría actualizada" : "Categoría creada" });
        router.refresh();
        setIsFormOpen(false);
        setEditingCategory(null);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    };

    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredCategories.map(c => [
            c.name,
            c.description,
            c.status,
        ]);
        const tableHeaders = ["Nombre", "Descripción", "Estado"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Categorías", 14, 35);
        
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

        doc.save(`reporte_categorias_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    
    const renderTable = (categories: Category[]) => (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">Icono</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {categories.map((category) => (
                        <TableRow key={category.id}>
                            <TableCell>
                                {category.iconName ? (
                                    <Icon name={category.iconName as IconName} className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                    <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center">Sin icono</div>
                                )}
                            </TableCell>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description}</TableCell>
                            <TableCell>
                                <Badge variant={category.status === 'Activo' ? 'default' : 'secondary'}>{category.status}</Badge>
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
                                        <DropdownMenuItem onClick={() => handleEdit(category)}>
                                            <LayoutGrid className="mr-2 h-4 w-4"/> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(category)}>
                                            {category.status === 'Activo' ? 
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
                        Mostrando <strong>{categories.length}</strong> de <strong>{filteredCategories.length}</strong> categorías.
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
                        <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Categorías</h1>
                        <p className="text-muted-foreground">Organiza tus productos en categorías principales.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Categoría
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Input
                        placeholder="Buscar por nombre o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="active">Activas</TabsTrigger>
                            <TabsTrigger value="inactive">Inactivas</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            {renderTable(paginatedCategories)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedCategories)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Editar" : "Crear"} Categoría</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? "Modifica los detalles de la categoría." : "Añade una nueva categoría a tu tienda."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="iconName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Icono</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un icono" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {iconList.map(iconName => (
                                        <SelectItem key={iconName} value={iconName}>
                                            <div className="flex items-center gap-2"><Icon name={iconName} className="h-4 w-4" /><span>{iconName}</span></div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
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
                    Vas a {categoryToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} la categoría &quot;{categoryToToggle?.name}&quot;.
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
