

'use client';

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Pencil, CalendarIcon, Archive, ArchiveRestore, Tag, FileDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Discount, Product, StoreConfig } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { addDiscountAction, updateDiscountAction, getStoreConfigAction } from "@/lib/actions";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

const discountSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  type: z.enum(['Porcentaje', 'Fijo', 'Combo']),
  value: z.coerce.number().min(0, "El valor no puede ser negativo."),
  status: z.enum(['Activo', 'Inactivo']),
  applicableProductIds: z.array(z.string()).min(1, "Debes seleccionar al menos un producto."),
  endDate: z.date().optional().nullable(),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.type === 'Combo' && data.applicableProductIds.length < 2) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Los descuentos de tipo 'Combo' deben aplicarse al menos a dos productos.",
            path: ['applicableProductIds'],
        });
    }
});

type DiscountFormValues = z.infer<typeof discountSchema>;

interface DiscountsPageClientProps {
    initialDiscounts: Discount[];
    allProducts: Product[];
}

export default function DiscountsPageClient({ initialDiscounts, allProducts }: DiscountsPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [allDiscounts, setAllDiscounts] = useState<Discount[]>(initialDiscounts);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [discountToToggle, setDiscountToToggle] = useState<Discount | null>(null);
    const [productSearchTerm, setProductSearchTerm] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("active");
    const [currentPage, setCurrentPage] = useState(1);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

    useEffect(() => { 
        setAllDiscounts(initialDiscounts);
    }, [initialDiscounts]);
    
    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);
    
    const filteredDiscounts = useMemo(() => {
        return allDiscounts.filter(discount => {
            const searchMatch = discount.name.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = (activeTab === 'active' ? discount.status === 'Activo' : discount.status === 'Inactivo');
            return searchMatch && statusMatch;
        });
    }, [allDiscounts, searchTerm, activeTab]);

    const totalPages = Math.ceil(filteredDiscounts.length / ITEMS_PER_PAGE);
    const paginatedDiscounts = useMemo(() => filteredDiscounts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredDiscounts, currentPage]);

    const form = useForm<DiscountFormValues>({
      resolver: zodResolver(discountSchema),
      defaultValues: { name: "", type: "Porcentaje", value: 0, status: "Activo", applicableProductIds: [], endDate: null, maxUses: null },
    });
    
    const typeWatcher = form.watch('type');
    const applicableProductsWatcher = form.watch('applicableProductIds');

    const filteredProducts = useMemo(() => {
        if (!productSearchTerm) return allProducts;
        return allProducts.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
    }, [allProducts, productSearchTerm]);

    useEffect(() => {
      if (editingDiscount) {
        form.reset({
          ...editingDiscount,
          applicableProductIds: editingDiscount.applicableProductIds || [],
          endDate: editingDiscount.endDate ? new Date(editingDiscount.endDate) : null,
          maxUses: editingDiscount.maxUses || null,
        });
      } else {
        form.reset({ name: "", type: "Porcentaje", value: 0, status: "Activo", applicableProductIds: [], endDate: null, maxUses: null });
      }
      setProductSearchTerm("");
    }, [editingDiscount, form]);

    const handleCreate = () => {
      setEditingDiscount(null);
      setIsDialogOpen(true);
    };
    
    const handleEdit = (discount: Discount) => {
      setEditingDiscount(discount);
      setIsDialogOpen(true);
    };

    const handleToggleStatus = (discount: Discount) => {
      setDiscountToToggle(discount);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!discountToToggle) return;
      
      const newStatus = discountToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
      const result = await updateDiscountAction({ ...discountToToggle, status: newStatus });
      
      if (result.success) {
        toast({ title: `Descuento ${newStatus === 'Activo' ? 'activado' : 'desactivado'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      
      setDiscountToToggle(null);
      setIsConfirmOpen(false);
    };

    const onSubmit = async (data: DiscountFormValues) => {
      const result = editingDiscount ? 
        await updateDiscountAction({ ...editingDiscount, ...data, endDate: data.endDate?.toISOString() }) :
        await addDiscountAction({...data, endDate: data.endDate?.toISOString()});

      if (result.success) {
        toast({ title: editingDiscount ? "Descuento actualizado" : "Descuento creado" });
        router.refresh();
        setIsDialogOpen(false);
        setEditingDiscount(null);
      } else {
         toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    };

    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredDiscounts.map(d => [
            d.name,
            d.type,
            d.applicableProductIds.length.toString(),
            `${d.uses} / ${d.maxUses ?? '∞'}`,
            d.endDate ? format(new Date(d.endDate), "dd/MM/yyyy") : 'Sin fecha',
            d.status,
        ]);
        const tableHeaders = ["Nombre", "Tipo", "Productos", "Usos", "Termina", "Estado"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Descuentos", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        const tabText = activeTab === 'active' ? 'Activas' : 'Inactivas';
        const filtersApplied = `Pestaña: "${tabText}", Búsqueda: "${searchTerm || 'Ninguna'}"`;

        doc.text(`Filtros Aplicados: ${filtersApplied}`, 14, 40);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 44);

        autoTable(doc, {
            startY: 50,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 22, 22] },
            styles: { font: 'helvetica', fontSize: 8 },
        });

        doc.save(`reporte_descuentos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const getValueLabel = () => {
        switch (typeWatcher) {
            case 'Porcentaje': return 'Valor (%)';
            case 'Fijo': return 'Valor Fijo ($)';
            case 'Combo': return 'Precio Fijo del Combo ($)';
            default: return 'Valor';
        }
    };
    
    const renderTable = (discountsToRender: Discount[]) => (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Usos</TableHead>
                        <TableHead>Termina</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {discountsToRender.map((discount) => (
                        <TableRow key={discount.id}>
                            <TableCell className="font-medium">{discount.name}</TableCell>
                            <TableCell>{discount.type}</TableCell>
                            <TableCell>{Array.isArray(discount.applicableProductIds) ? discount.applicableProductIds.length : 0}</TableCell>
                            <TableCell>{discount.uses} / {discount.maxUses ?? '∞'}</TableCell>
                            <TableCell>{discount.endDate ? format(new Date(discount.endDate), "dd/MM/yyyy") : 'Sin fecha'}</TableCell>
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={cn({
                                        "text-green-700 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-700 dark:bg-green-950": discount.status === 'Activo',
                                        "text-zinc-600 border-zinc-200 bg-zinc-50 dark:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950": discount.status === 'Inactivo',
                                    })}
                                >
                                    {discount.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(discount)}>
                                          <Pencil className="mr-2 h-4 w-4"/> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(discount)}>
                                          {discount.status === 'Activo' ? 
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
                        Mostrando <strong>{discountsToRender.length}</strong> de <strong>{filteredDiscounts.length}</strong> descuentos.
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
                        <Tag className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Descuentos y Promociones</h1>
                        <p className="text-muted-foreground">Configura ofertas y promociones para productos específicos.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Promoción
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Input 
                        placeholder="Buscar por nombre..."
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
                            {renderTable(paginatedDiscounts)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedDiscounts)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{editingDiscount ? "Editar" : "Crear"} Promoción</DialogTitle>
                  <DialogDescription>
                    {editingDiscount ? "Modifica los detalles de la promoción." : "Configura una nueva promoción para tu tienda."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 flex-1 overflow-y-auto pr-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Porcentaje">Porcentaje</SelectItem>
                                <SelectItem value="Fijo">Fijo</SelectItem>
                                <SelectItem value="Combo">Combo</SelectItem>
                              </SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="value" render={({ field }) => (
                          <FormItem><FormLabel>{getValueLabel()}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField
                      control={form.control}
                      name="applicableProductIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Productos Aplicables</FormLabel>
                           <Input
                              placeholder="Buscar productos..."
                              value={productSearchTerm}
                              onChange={(e) => setProductSearchTerm(e.target.value)}
                              className="mb-2"
                            />
                          <ScrollArea className="h-48 w-full rounded-md border p-4">
                              {filteredProducts.length > 0 ? (
                                  filteredProducts.map((product) => (
                                    <FormItem key={product.id} className="flex flex-row items-center space-x-3 space-y-0 mb-3">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(product.id)}
                                          disabled={(typeWatcher === 'Porcentaje' || typeWatcher === 'Fijo') && applicableProductsWatcher.length > 0 && !applicableProductsWatcher.includes(product.id)}
                                          onCheckedChange={(checked) => {
                                            const isSingleProductDiscount = typeWatcher === 'Porcentaje' || typeWatcher === 'Fijo';
                                            if (isSingleProductDiscount) {
                                                return field.onChange(checked ? [product.id] : []);
                                            } else { // For 'Combo'
                                                const currentIds = field.value || [];
                                                if (checked) {
                                                    return field.onChange([...currentIds, product.id]);
                                                } else {
                                                    return field.onChange(
                                                    currentIds.filter(
                                                        (value) => value !== product.id
                                                    )
                                                    );
                                                }
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal text-sm">
                                        {product.name}
                                      </FormLabel>
                                    </FormItem>
                                  ))
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-4">
                                        No se encontraron productos.
                                    </div>
                                )}
                          </ScrollArea>
                          <FormDescription>
                              {typeWatcher === 'Porcentaje' || typeWatcher === 'Fijo' ? 'Selecciona un solo producto.' : 'Selecciona dos o más productos para un combo.'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="maxUses" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Usos Máximos (opcional)</FormLabel>
                            <FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} placeholder="Dejar en blanco para usos ilimitados" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                        <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Fecha de Fin (opcional)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP")
                                        ) : (
                                            <span>Elige una fecha</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => field.onChange(date)}
                                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                  <DialogFooter className="pt-4 mt-auto">
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
                     Vas a {discountToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} la promoción &quot;{discountToToggle?.name}&quot;.
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
