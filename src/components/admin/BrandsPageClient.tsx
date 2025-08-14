

'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Archive, ArchiveRestore, Award, FileDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Brand, StoreConfig } from "@/types";
import { useRouter } from "next/navigation";
import { addBrandAction, updateBrandAction, getStoreConfigAction } from "@/lib/actions";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "../ui/badge";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

const brandSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  description: z.string().min(5, "La descripción es muy corta."),
});

type BrandFormValues = z.infer<typeof brandSchema>;

interface BrandsPageClientProps {
    initialBrands: Brand[];
}

export default function BrandsPageClient({ initialBrands }: BrandsPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [allBrands, setAllBrands] = useState<Brand[]>(initialBrands);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [brandToToggle, setBrandToToggle] = useState<Brand | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState("active");
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
    
    useEffect(() => { 
        setAllBrands(initialBrands); 
    }, [initialBrands]);

    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);

    const filteredBrands = useMemo(() => {
        return allBrands.filter(brand => 
            (activeTab === 'active' ? brand.status === 'Activo' : brand.status === 'Inactivo') &&
            (brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [allBrands, searchTerm, activeTab]);
    
    const totalPages = Math.ceil(filteredBrands.length / ITEMS_PER_PAGE);
    const paginatedBrands = useMemo(() => filteredBrands.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredBrands, currentPage]);

    const form = useForm<BrandFormValues>({
      resolver: zodResolver(brandSchema),
      defaultValues: { name: "", description: "" },
    });

    useEffect(() => {
      if (editingBrand) {
        form.reset(editingBrand);
      } else {
        form.reset({ name: "", description: "" });
      }
    }, [editingBrand, form]);

    const handleCreate = () => {
      setEditingBrand(null);
      setIsFormOpen(true);
    };
    
    const handleEdit = (brand: Brand) => {
      setEditingBrand(brand);
      setIsFormOpen(true);
    };

    const handleToggleStatus = (brand: Brand) => {
      setBrandToToggle(brand);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!brandToToggle) return;
      
      const newStatus = brandToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
      const result = await updateBrandAction({ ...brandToToggle, status: newStatus });
      
      if (result.success) {
        toast({ title: `Marca ${newStatus === 'Activo' ? 'activada' : 'desactivada'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      
      setBrandToToggle(null);
      setIsConfirmOpen(false);
    };

    const onSubmit = async (data: BrandFormValues) => {
      const action = editingBrand 
        ? updateBrandAction({ ...editingBrand, ...data }) 
        : addBrandAction({ ...data });

      const result = await action;
      if(result.success) {
        toast({ title: editingBrand ? "Marca actualizada" : "Marca creada" });
        router.refresh();
        setIsFormOpen(false);
        setEditingBrand(null);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    };
    
    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredBrands.map(b => [
            b.name,
            b.description,
            b.status,
        ]);
        const tableHeaders = ["Nombre", "Descripción", "Estado"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Marcas", 14, 35);
        
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

        doc.save(`reporte_marcas_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const renderTable = (brands: Brand[]) => (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {brands.map((brand) => (
                        <TableRow key={brand.id}>
                            <TableCell className="font-medium">{brand.name}</TableCell>
                            <TableCell>{brand.description}</TableCell>
                            <TableCell>
                                <Badge variant={brand.status === 'Activo' ? 'default' : 'secondary'}>{brand.status}</Badge>
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
                                        <DropdownMenuItem onClick={() => handleEdit(brand)}>
                                            <Award className="mr-2 h-4 w-4"/> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(brand)}>
                                            {brand.status === 'Activo' ? 
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
                        Mostrando <strong>{brands.length}</strong> de <strong>{filteredBrands.length}</strong> marcas.
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
                        <Award className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Marcas</h1>
                        <p className="text-muted-foreground">Gestiona las marcas de los productos que vendes.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Marca
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
                            {renderTable(paginatedBrands)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedBrands)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingBrand ? "Editar" : "Crear"} Marca</DialogTitle>
                  <DialogDescriptionComponent>
                    {editingBrand ? "Modifica los detalles de la marca." : "Añade una nueva marca a tu tienda."}
                  </DialogDescriptionComponent>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
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
                  <AlertDialogDescription>
                    Vas a {brandToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} la marca &quot;{brandToToggle?.name}&quot;.
                  </AlertDialogDescription>
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
