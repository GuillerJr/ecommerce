

'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Pencil, CalendarIcon, Archive, ArchiveRestore, Ticket, FileDown } from "lucide-react";
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
import type { Coupon, StoreConfig } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { addCouponAction, updateCouponAction, getStoreConfigAction } from "@/lib/actions";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

const couponSchema = z.object({
  code: z.string().min(4, "El código debe tener al menos 4 caracteres.").toUpperCase(),
  type: z.enum(['Porcentaje', 'Fijo', 'Envío Gratis']),
  value: z.coerce.number().nullable(),
  maxUses: z.coerce.number().nullable(),
  status: z.enum(['Activo', 'Inactivo', 'Expirado', 'Agotado']),
  expiryDate: z.string().optional().nullable(),
}).refine(data => data.type === 'Envío Gratis' || (data.value !== null && data.value > 0), {
  message: "El valor es requerido para este tipo de cupón.",
  path: ["value"],
});

type CouponFormValues = z.infer<typeof couponSchema>;

interface CouponsPageClientProps {
    initialCoupons: Coupon[];
}

export default function CouponsPageClient({ initialCoupons }: CouponsPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [allCoupons, setAllCoupons] = useState<Coupon[]>(initialCoupons);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [couponToToggle, setCouponToToggle] = useState<Coupon | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("active");
    const [currentPage, setCurrentPage] = useState(1);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

    useEffect(() => { 
        setAllCoupons(initialCoupons); 
    }, [initialCoupons]);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);
    
    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    const filteredCoupons = useMemo(() => {
        return allCoupons.filter(coupon => {
            const searchMatch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase());
            let statusMatch = false;
            if (activeTab === 'active') {
                statusMatch = coupon.status === 'Activo';
            } else { // 'inactive' tab
                statusMatch = ['Inactivo', 'Expirado', 'Agotado'].includes(coupon.status);
            }
            return searchMatch && statusMatch;
        });
    }, [allCoupons, searchTerm, activeTab]);

    const totalPages = Math.ceil(filteredCoupons.length / ITEMS_PER_PAGE);
    const paginatedCoupons = useMemo(() => filteredCoupons.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredCoupons, currentPage]);

    const form = useForm<CouponFormValues>({
      resolver: zodResolver(couponSchema),
      defaultValues: { code: "", type: "Porcentaje", value: null, maxUses: null, status: "Activo", expiryDate: null }
    });

    const typeWatcher = form.watch("type");

    useEffect(() => {
      if (editingCoupon) {
        form.reset({
          ...editingCoupon,
          value: editingCoupon.value ?? null,
          maxUses: editingCoupon.maxUses ?? null,
          expiryDate: editingCoupon.expiryDate ? new Date(editingCoupon.expiryDate).toISOString() : null,
        });
      } else {
        form.reset({
          code: "",
          type: "Porcentaje",
          value: null,
          maxUses: null,
          status: "Activo",
          expiryDate: null,
        });
      }
    }, [editingCoupon, form]);

    const handleCreate = () => {
      setEditingCoupon(null);
      setIsDialogOpen(true);
    };
    
    const handleEdit = (coupon: Coupon) => {
      setEditingCoupon(coupon);
      setIsDialogOpen(true);
    };

    const handleToggleStatus = (coupon: Coupon) => {
      if (coupon.status !== 'Activo' && coupon.status !== 'Inactivo') return;
      setCouponToToggle(coupon);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!couponToToggle) return;
      
      const newStatus = couponToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
      const result = await updateCouponAction({ ...couponToToggle, status: newStatus });
      
      if (result.success) {
        toast({ title: `Cupón ${newStatus === 'Activo' ? 'activado' : 'desactivado'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }

      setCouponToToggle(null);
      setIsConfirmOpen(false);
    };

    const onSubmit = async (data: CouponFormValues) => {
        const couponData = {
            ...data,
            value: data.type === 'Envío Gratis' ? null : data.value,
            expiryDate: data.expiryDate || null,
        };

        const result = editingCoupon
            ? await updateCouponAction({ ...editingCoupon, ...couponData })
            : await addCouponAction(couponData);
        
        if (result.success) {
            toast({ title: editingCoupon ? "Cupón actualizado" : "Cupón creado" });
            router.refresh();
            setIsDialogOpen(false);
            setEditingCoupon(null);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };
    
    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredCoupons.map(c => [
            c.code,
            c.type,
            formatValue(c),
            formatUses(c),
            c.expiryDate ? format(new Date(c.expiryDate), "dd/MM/yyyy") : 'Nunca',
            c.status,
        ]);
        const tableHeaders = ["Código", "Tipo", "Valor", "Usos", "Expira", "Estado"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Cupones", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        const tabText = activeTab === 'active' ? 'Activos' : 'Inactivos y otros';
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

        doc.save(`reporte_cupones_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const formatValue = (c: Coupon) => {
      if (c.type === 'Envío Gratis') return 'N/A';
      if (c.type === 'Porcentaje') return `${c.value}%`;
      return `$${c.value?.toFixed(2)}`;
    }
    
    const formatUses = (c: Coupon) => {
        if (c.maxUses === null) return `${c.uses} / ∞`;
        return `${c.uses} / ${c.maxUses}`;
    }
    
    const renderTable = (couponsToRender: Coupon[]) => (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Usos</TableHead>
                        <TableHead>Expira</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {couponsToRender.map((coupon) => (
                        <TableRow key={coupon.id}>
                            <TableCell className="font-medium"><Badge variant="outline">{coupon.code}</Badge></TableCell>
                            <TableCell>{coupon.type}</TableCell>
                            <TableCell>{formatUses(coupon)}</TableCell>
                            <TableCell>
                                {coupon.expiryDate ? format(new Date(coupon.expiryDate), "dd/MM/yyyy") : 'Nunca'}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={cn({
                                        "text-green-700 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-700 dark:bg-green-950": coupon.status === 'Activo',
                                        "text-zinc-600 border-zinc-200 bg-zinc-50 dark:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950": coupon.status === 'Inactivo',
                                        "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:bg-amber-950": coupon.status === 'Expirado',
                                        "text-red-700 border-red-200 bg-red-50 dark:text-red-300 dark:border-red-700 dark:bg-red-950": coupon.status === 'Agotado',
                                    })}
                                >
                                    {coupon.status}
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
                                        <DropdownMenuItem onClick={() => handleEdit(coupon)}>
                                          <Pencil className="mr-2 h-4 w-4"/> Editar
                                        </DropdownMenuItem>
                                        {(coupon.status === 'Activo' || coupon.status === 'Inactivo') && (
                                            <DropdownMenuItem onClick={() => handleToggleStatus(coupon)}>
                                                {coupon.status === 'Activo' ? 
                                                    <><Archive className="mr-2 h-4 w-4"/> Desactivar</> : 
                                                    <><ArchiveRestore className="mr-2 h-4 w-4"/> Activar</>
                                                }
                                            </DropdownMenuItem>
                                        )}
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
                        Mostrando <strong>{couponsToRender.length}</strong> de <strong>{filteredCoupons.length}</strong> cupones.
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
                        <Ticket className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Cupones</h1>
                        <p className="text-muted-foreground">Crea y gestiona códigos de descuento para tus clientes.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Cupón
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Input 
                        placeholder="Buscar por código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="active">Activos</TabsTrigger>
                            <TabsTrigger value="inactive">Inactivos y otros</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            {renderTable(paginatedCoupons)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedCoupons)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCoupon ? "Editar" : "Crear"} Cupón</DialogTitle>
                  <DialogDescription>
                    {editingCoupon ? "Modifica los detalles del cupón." : "Añade un nuevo cupón a tu tienda."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="code" render={({ field }) => (
                      <FormItem><FormLabel>Código</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="Porcentaje">Porcentaje</SelectItem><SelectItem value="Fijo">Fijo</SelectItem><SelectItem value="Envío Gratis">Envío Gratis</SelectItem></SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    {typeWatcher !== 'Envío Gratis' && (
                      <FormField control={form.control} name="value" render={({ field }) => (
                          <FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value === null || field.value === undefined ? '' : field.value} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    )}
                    <FormField control={form.control} name="maxUses" render={({ field }) => (
                      <FormItem><FormLabel>Usos Máximos (dejar en blanco para ilimitado)</FormLabel><FormControl><Input type="number" {...field} value={field.value === null || field.value === undefined ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField
                        control={form.control}
                        name="expiryDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Expiración (opcional)</FormLabel>
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
                                        format(new Date(field.value), "PPP")
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
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Activo">Activo</SelectItem>
                            <SelectItem value="Inactivo">Inactivo</SelectItem>
                            <SelectItem value="Expirado">Expirado</SelectItem>
                            <SelectItem value="Agotado">Agotado</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
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
                    Vas a {couponToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} el cupón &quot;{couponToToggle?.code}&quot;.
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
