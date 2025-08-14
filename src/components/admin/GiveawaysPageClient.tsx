

'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Pencil, CalendarIcon, Trophy, Loader2, Archive, ArchiveRestore, Gift, FileDown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { Giveaway, Product, User, StoreConfig } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { addGiveawayAction, updateGiveawayAction, drawWinnerAction, getStoreConfigAction } from "@/lib/actions";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Pagination, PaginationContent, PaginationItem } from "../ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

const giveawaySchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  description: z.string().min(5, "La descripción es muy corta."),
  entryType: z.enum(['open', 'purchase_based'], { required_error: "Debes seleccionar un tipo de entrada." }),
  minPurchaseAmount: z.coerce.number().optional(),
  productPrizeIds: z.array(z.string()).min(1, "Debes seleccionar al menos un producto como premio."),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  endDate: z.date({ required_error: "La fecha de fin es requerida." }),
}).refine(data => data.endDate > data.startDate, {
  message: "La fecha de fin debe ser posterior a la de inicio.",
  path: ["endDate"],
}).refine(data => data.entryType !== 'purchase_based' || (data.minPurchaseAmount && data.minPurchaseAmount > 0), {
    message: "El monto de compra mínimo es requerido para este tipo de sorteo.",
    path: ["minPurchaseAmount"],
});


type GiveawayFormValues = z.infer<typeof giveawaySchema>;

interface GiveawaysPageClientProps {
    initialGiveaways: Giveaway[];
    allProducts: Product[];
    allUsers: User[];
}

export default function GiveawaysPageClient({ initialGiveaways, allProducts, allUsers }: GiveawaysPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [giveaways, setGiveaways] = useState(initialGiveaways);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
    const [giveawayToToggle, setGiveawayToToggle] = useState<Giveaway | null>(null);
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [drawingWinnerId, setDrawingWinnerId] = useState<string|null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState("active");
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

    useEffect(() => {
        setGiveaways(initialGiveaways);
    }, [initialGiveaways]);
    
    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    useEffect(() => setCurrentPage(1), [activeTab]);
    
    const filteredGiveaways = useMemo(() => {
        return giveaways.filter(g => {
            if (activeTab === 'active') return ['Activo', 'Programado'].includes(g.status);
            if (activeTab === 'finished') return g.status === 'Finalizado';
            if (activeTab === 'inactive') return g.status === 'Inactivo';
            return true;
        });
    }, [giveaways, activeTab]);
    
    const totalPages = Math.ceil(filteredGiveaways.length / ITEMS_PER_PAGE);
    const paginatedGiveaways = useMemo(() => filteredGiveaways.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredGiveaways, currentPage]);

    const form = useForm<GiveawayFormValues>({
      resolver: zodResolver(giveawaySchema),
    });
    
    const entryTypeWatcher = form.watch('entryType');

    const filteredProducts = useMemo(() => {
        if (!productSearchTerm) return allProducts;
        return allProducts.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
    }, [allProducts, productSearchTerm]);

    useEffect(() => {
      if (isDialogOpen) {
        const defaultValues = editingGiveaway ? {
            ...editingGiveaway,
            startDate: new Date(editingGiveaway.startDate),
            endDate: new Date(editingGiveaway.endDate),
            minPurchaseAmount: editingGiveaway.minPurchaseAmount || undefined,
        } : { name: "", description: "", productPrizeIds: [], startDate: undefined, endDate: undefined, entryType: 'open', minPurchaseAmount: undefined };
        form.reset(defaultValues as any);
      }
    }, [isDialogOpen, editingGiveaway, form]);

    const handleCreate = () => {
      setEditingGiveaway(null);
      setIsDialogOpen(true);
    };
    
    const handleEdit = (giveaway: Giveaway) => {
      setEditingGiveaway(giveaway);
      setIsDialogOpen(true);
    };

    const handleToggleStatus = (giveaway: Giveaway) => {
      setGiveawayToToggle(giveaway);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!giveawayToToggle) return;
      
      const newStatus = giveawayToToggle.status === 'Inactivo' ? 'Programado' : 'Inactivo';
      const result = await updateGiveawayAction({ ...giveawayToToggle, status: newStatus });
      
      if (result.success) {
        toast({ title: `Sorteo ${newStatus === 'Programado' ? 'activado' : 'desactivado'}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setGiveawayToToggle(null);
      setIsConfirmOpen(false);
    };

    const handleDrawWinner = async (giveawayId: string) => {
        setDrawingWinnerId(giveawayId);
        const result = await drawWinnerAction(giveawayId);
        if (result.success && result.winner) {
            toast({ title: "¡Ganador elegido!", description: `El ganador es ${result.winner.name}.` });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setDrawingWinnerId(null);
    }

    const onSubmit = async (data: GiveawayFormValues) => {
      const giveawayData = {
          ...data,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate.toISOString(),
          minPurchaseAmount: data.entryType === 'purchase_based' ? data.minPurchaseAmount : undefined,
      };

      if (editingGiveaway) {
        await updateGiveawayAction({ ...editingGiveaway, ...giveawayData });
        toast({ title: "Sorteo actualizado" });
      } else {
        await addGiveawayAction(giveawayData);
        toast({ title: "Sorteo creado" });
      }
      router.refresh();
      setIsDialogOpen(false);
    };
    
    const getWinnerName = (winnerId: string | null) => {
        if (!winnerId) return 'N/A';
        return allUsers.find(u => u.id === winnerId)?.name || 'Usuario desconocido';
    }
    
    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredGiveaways.map(g => [
            g.name,
            g.status,
            g.entryType === 'open' ? 'Abierta' : `Por Compra ($${g.minPurchaseAmount?.toFixed(2)})`,
            `${format(new Date(g.startDate), 'dd/MM/yy')} - ${format(new Date(g.endDate), 'dd/MM/yy')}`,
            g.participants.length.toString(),
            g.winnerId ? getWinnerName(g.winnerId) : 'Pendiente'
        ]);
        const tableHeaders = ["Nombre", "Estado", "Tipo de Entrada", "Fechas", "Participantes", "Ganador"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Sorteos", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        const tabText = activeTab === 'active' ? 'Activos/Programados' : activeTab === 'finished' ? 'Finalizados' : 'Inactivos';
        const filtersApplied = `Pestaña: "${tabText}"`;

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

        doc.save(`reporte_sorteos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const renderTable = (giveawaysToRender: Giveaway[]) => (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Tipo de Entrada</TableHead>
                        <TableHead>Fechas</TableHead>
                        <TableHead>Participantes</TableHead>
                        <TableHead>Ganador</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {giveawaysToRender.map((giveaway) => (
                        <TableRow key={giveaway.id}>
                            <TableCell className="font-medium">{giveaway.name}</TableCell>
                            <TableCell><Badge variant={giveaway.status === 'Activo' ? 'default' : 'secondary'}>{giveaway.status}</Badge></TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="capitalize">{giveaway.entryType === 'open' ? 'Abierta' : 'Por Compra'}</span>
                                    {giveaway.entryType === 'purchase_based' && <span className="text-xs text-muted-foreground">${giveaway.minPurchaseAmount?.toFixed(2)}</span>}
                                </div>
                            </TableCell>
                            <TableCell>{format(new Date(giveaway.startDate), 'dd/MM/yy')} - {format(new Date(giveaway.endDate), 'dd/MM/yy')}</TableCell>
                            <TableCell>{giveaway.participants.length}</TableCell>
                            <TableCell>{giveaway.winnerId ? getWinnerName(giveaway.winnerId) : (
                                giveaway.status === 'Finalizado' ? (
                                    <Button size="sm" variant="outline" onClick={() => handleDrawWinner(giveaway.id)} disabled={drawingWinnerId === giveaway.id}>
                                        {drawingWinnerId === giveaway.id ? <Loader2 className="animate-spin mr-2"/> : <Trophy className="mr-2 h-4 w-4"/>}
                                        Elegir
                                    </Button>
                                ) : 'Pendiente'
                            )}</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(giveaway)}><Pencil className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(giveaway)}>
                                            {giveaway.status === 'Inactivo' ?
                                                <><ArchiveRestore className="mr-2 h-4 w-4" /> Activar</> :
                                                <><Archive className="mr-2 h-4 w-4" /> Desactivar</>
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
                        Mostrando <strong>{paginatedGiveaways.length}</strong> de <strong>{filteredGiveaways.length}</strong> sorteos.
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
                        <Gift className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Sorteos</h1>
                        <p className="text-muted-foreground">Crea y gestiona sorteos para tus clientes.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" /> Crear Sorteo</Button>
                </div>
            </div>
            <Card>
                <CardHeader><CardTitle>Todos los Sorteos</CardTitle></CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="active">Activos/Programados</TabsTrigger>
                            <TabsTrigger value="finished">Finalizados</TabsTrigger>
                            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            {renderTable(paginatedGiveaways)}
                        </TabsContent>
                        <TabsContent value="finished" className="mt-4">
                            {renderTable(paginatedGiveaways)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedGiveaways)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingGiveaway ? "Editar" : "Crear"} Sorteo</DialogTitle>
                  <DialogDescription>
                    {editingGiveaway ? "Modifica los detalles del sorteo." : "Configura un nuevo sorteo para tus clientes."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                    
                     <FormField control={form.control} name="entryType" render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Tipo de Entrada</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="open" /></FormControl>
                                    <FormLabel className="font-normal">Abierta (cualquier usuario puede participar)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="purchase_based" /></FormControl>
                                    <FormLabel className="font-normal">Basada en Compra (requiere un monto mínimo de compra)</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                     )}/>
                     
                     {entryTypeWatcher === 'purchase_based' && (
                        <FormField control={form.control} name="minPurchaseAmount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Monto Mínimo de Compra</FormLabel>
                                <FormControl><Input type="number" placeholder="Ej. 50.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                     )}


                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Fecha de Inicio</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                               <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                            </PopoverContent></Popover><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Fecha de Fin</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                               <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                            </PopoverContent></Popover><FormMessage /></FormItem>
                      )}/>
                    </div>

                    <FormField control={form.control} name="productPrizeIds" render={() => (
                        <FormItem><FormLabel>Productos de Premio</FormLabel>
                           <Input placeholder="Buscar productos..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="mb-2"/>
                          <ScrollArea className="h-40 w-full rounded-md border p-4">
                              {filteredProducts.map((product) => (
                                <FormField key={product.id} control={form.control} name="productPrizeIds" render={({ field }) => (
                                  <FormItem key={product.id} className="flex flex-row items-center space-x-3 space-y-0 mb-3">
                                    <FormControl>
                                      <Checkbox checked={field.value?.includes(product.id)} onCheckedChange={(checked) => {
                                          return checked ? field.onChange([...(field.value || []), product.id]) : field.onChange(field.value?.filter((value) => value !== product.id));
                                      }}/>
                                    </FormControl>
                                    <FormLabel className="font-normal text-sm">{product.name}</FormLabel>
                                  </FormItem>
                                )}/>
                              ))}
                          </ScrollArea><FormMessage /></FormItem>
                    )}/>
                    
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
                    Vas a {giveawayToToggle?.status === 'Inactivo' ? 'activar' : 'desactivar'} el sorteo &quot;{giveawayToToggle?.name}&quot;.
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
