

'use client';

import { useState, Fragment, useMemo, useEffect } from "react";
import type { Order, OrderStatus, Product, StoreConfig, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ClipboardList, CheckCircle2, Package, Truck, CircleDotDashed, FileDown, Mail, Phone, Home as HomeIcon, User as UserIcon, CalendarIcon, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { updateOrderStatusAction, getStoreConfigAction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { format, type Locale } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from "@/contexts/AuthContext";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "../ui/calendar";
import { type DateRange } from "react-day-picker";

const ITEMS_PER_PAGE = 10;

const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
        case 'Entregado': return 'default';
        case 'Enviado': return 'secondary';
        case 'En Tránsito': return 'secondary';
        case 'Procesando': return 'outline';
        case 'Pendiente': return 'outline';
        case 'Cancelado': return 'destructive';
        default: return 'outline';
    }
};

const statusIcons: Record<OrderStatus, React.ElementType> = {
    Pendiente: CircleDotDashed,
    Procesando: Package,
    Enviado: Truck,
    'En Tránsito': Truck,
    Entregado: CheckCircle2,
    Cancelado: CircleDotDashed,
};

const CustomizationDetails = ({ customization }: { customization?: any }) => {
    if (!customization || Object.values(customization).every(v => v === undefined || v === false || v === '')) {
        return null;
    }

    return (
        <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
            {customization.size && <li>Talla: {customization.size}</li>}
            {customization.patches && <li>Con Parches</li>}
            {customization.nameAndNumber && <li>Con Nombre/Dorsal</li>}
            {customization.notes && <li className="truncate" title={customization.notes}>Nota: {customization.notes}</li>}
        </ul>
    );
};

interface OrdersPageClientProps {
    initialOrders: Order[];
    allProducts: Product[];
}

export default function OrdersPageClient({ initialOrders, allProducts }: OrdersPageClientProps) {
    const router = useRouter();
    const [allOrders, setAllOrders] = useState<Order[]>(initialOrders);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
    const { toast } = useToast();
    const { user } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) {
                setStoreConfig(result.config);
            }
        });
    }, []);

    useEffect(() => {
        setAllOrders(initialOrders);
    }, [initialOrders]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, dateRange]);

    const filteredOrders = useMemo(() => {
        return allOrders.filter(order => {
            const searchMatch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                order.id.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = statusFilter === 'all' || order.status === statusFilter;
            
            const orderDate = new Date(order.date);
            const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            
            const toDate = dateRange?.to ? new Date(dateRange.to) : null;
            if(toDate) toDate.setHours(23, 59, 59, 999);

            const dateMatch = 
                (!fromDate || orderDate >= fromDate) && 
                (!toDate || orderDate <= toDate);
            
            return searchMatch && statusMatch && dateMatch;
        });
    }, [allOrders, searchTerm, statusFilter, dateRange]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = useMemo(() => filteredOrders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredOrders, currentPage]);
    
    const getProductById = (id: string) => allProducts.find(p => p.id === id);

    const handleViewDetails = (orderId: string) => {
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            setSelectedOrder(order);
            setNewStatus(order.status);
            setIsDialogOpen(true);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedOrder || !newStatus || !user) return;

        const result = await updateOrderStatusAction(selectedOrder.id, newStatus as OrderStatus, user.id);
        
        if (result.success && result.order) {
            setAllOrders(prevOrders => 
                prevOrders.map(o => o.id === result.order!.id ? result.order! : o)
            );
            toast({ title: "Estado del pedido actualizado" });
            router.refresh(); // To sync with server state
            setIsDialogOpen(false);
            setSelectedOrder(null);
        } else {
            toast({ title: "Error", description: result.message || "No se pudo actualizar el pedido.", variant: "destructive" });
        }
    };
    
     const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredOrders.map(order => [
            order.id.substring(0, 8),
            order.customerName,
            format(new Date(order.date), 'dd/MM/yyyy'),
            `$${order.total.toFixed(2)}`,
            order.paymentMethod || 'N/A',
            order.status,
        ]);
        const tableHeaders = ["ID", "Cliente", "Fecha", "Total", "Pago", "Estado"];
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Pedidos", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        const filtersApplied = `Estado: ${statusFilter === 'all' ? 'Todos' : statusFilter}, Búsqueda: "${searchTerm || 'Ninguna'}"`;
        doc.text(`Filtros Aplicados: ${filtersApplied}`, 14, 40);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 44);

        autoTable(doc, {
            startY: 50,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 22, 22] },
        });

        doc.save(`reporte_pedidos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-secondary p-3 rounded-full border">
                      <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
                        <p className="text-muted-foreground">Consulta y actualiza el estado de los pedidos de los clientes.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline">
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar Resumen
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Todos los Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <Input 
                            placeholder="Buscar por cliente, email o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as OrderStatus | 'all')}>
                            <SelectTrigger className="sm:w-[200px]">
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                {(['Pendiente', 'Procesando', 'Enviado', 'En Tránsito', 'Entregado', 'Cancelado'] as OrderStatus[]).map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "sm:w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Elige un rango de fechas</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pedido ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Método de Pago</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">#{order.id.substring(0, 8)}</TableCell>
                                    <TableCell className="font-medium">{order.customerName}</TableCell>
                                    <TableCell>{format(new Date(order.date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                                    <TableCell><Badge variant="outline">{order.paymentMethod || 'N/A'}</Badge></TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleViewDetails(order.id)}>
                                                    Ver Detalles y Actualizar
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
                                Mostrando <strong>{paginatedOrders.length}</strong> de <strong>{filteredOrders.length}</strong> pedidos.
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
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                        <DialogTitle>Detalles del Pedido #{selectedOrder?.id.substring(0, 8)}</DialogTitle>
                         {selectedOrder && <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="mt-2 sm:mt-0">{selectedOrder.status}</Badge>}
                      </div>
                      <DialogDescription>
                        Fecha del pedido: {selectedOrder && format(new Date(selectedOrder.date), 'PPP p', { locale: es })}.
                      </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                       <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h3 className="text-lg font-semibold mb-3">Seguimiento</h3>
                                  <div className="relative pl-6">
                                      {(selectedOrder.trackingHistory || []).map((event, index) => {
                                          const Icon = statusIcons[event.status] || CircleDotDashed;
                                          const isLast = index === (selectedOrder.trackingHistory || []).length - 1;
                                          return (
                                            <Fragment key={event.date}>
                                              <div className="flex items-start gap-4">
                                                {!isLast && <div className="absolute left-[11px] top-7 h-full w-0.5 bg-border"></div>}
                                                <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background">
                                                  <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 pb-8">
                                                  <p className="font-semibold">{event.status}</p>
                                                  <p className="text-sm text-muted-foreground">{event.description}</p>
                                                  <p className="text-xs text-muted-foreground/80 mt-1">{format(new Date(event.date), 'PPP p', { locale: es })}</p>
                                                </div>
                                              </div>
                                            </Fragment>
                                          );
                                      })}
                                    </div>
                              </div>
                              <div className="space-y-6">
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3">Información de Contacto y Envío</h3>
                                    <div className="text-sm space-y-3">
                                        <div className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground"/><span>{selectedOrder.customerName}</span></div>
                                        <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground"/><span>{selectedOrder.email}</span></div>
                                        {selectedOrder.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground"/><span>{selectedOrder.phone}</span></div>}
                                        {selectedOrder.shippingAddress && <>
                                            <Separator className="my-2"/>
                                            <div className="flex items-start gap-3"><HomeIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/>
                                                <div>
                                                  <span>{selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}</span><br/>
                                                  <span>{selectedOrder.shippingAddress.postalCode}, {selectedOrder.shippingAddress.country}</span>
                                                </div>
                                            </div>
                                        </>}
                                    </div>
                                  </div>
                                  <div>
                                      <label htmlFor="status-select" className="text-lg font-semibold block mb-2">Actualizar Estado</label>
                                      <Select value={newStatus || ""} onValueChange={(val) => setNewStatus(val as OrderStatus)}>
                                          <SelectTrigger id="status-select">
                                              <SelectValue placeholder="Seleccionar nuevo estado" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              {(['Pendiente', 'Procesando', 'Enviado', 'En Tránsito', 'Entregado', 'Cancelado'] as OrderStatus[]).map(status => (
                                                  <SelectItem key={status} value={status}>{status}</SelectItem>
                                              ))}
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                            </div>
                            <Separator/>
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Artículos y Resumen</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      {selectedOrder.items.map((item, index) => {
                                          const product = getProductById(item.productId);
                                          if (!product) return null;
                                          return (
                                              <div key={`${item.productId}-${index}`} className="flex items-start gap-4">
                                                  <Image src={product.image} alt={product.name} width={56} height={56} className="rounded-md border object-contain flex-shrink-0 p-1 bg-secondary/50" />
                                                  <div className="flex-1">
                                                      <p className="font-medium text-sm">{product.name}</p>
                                                      <p className="text-xs text-muted-foreground">
                                                          {item.quantity} x ${item.price.toFixed(2)}
                                                      </p>
                                                      <CustomizationDetails customization={item.customization} />
                                                  </div>
                                                  <p className="font-semibold text-sm">${(item.quantity * item.price).toFixed(2)}</p>
                                              </div>
                                          )
                                      })}
                                    </div>
                                    <div>
                                        <div className="space-y-2 text-sm border p-4 rounded-lg">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                            </div>
                                            {selectedOrder.discountAmount > 0 && (
                                            <div className="flex justify-between text-destructive">
                                                <span>Descuento {selectedOrder.couponCode && `(${selectedOrder.couponCode})`}</span>
                                                <span>-${selectedOrder.discountAmount.toFixed(2)}</span>
                                            </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">IVA ({selectedOrder.taxRate?.toFixed(2) ?? 0}%)</span>
                                                <span>${(selectedOrder.taxAmount ?? 0).toFixed(2)}</span>
                                            </div>
                                            {selectedOrder.paymentMethod && (
                                                <div className="flex justify-between"><span className="text-muted-foreground">Método de Pago</span><span>{selectedOrder.paymentMethod}</span></div>
                                            )}
                                            <Separator className="my-2" />
                                            <div className="flex justify-between font-bold text-base">
                                                <span>Total</span>
                                                <span>${selectedOrder.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                          </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleStatusUpdate} disabled={!newStatus || newStatus === selectedOrder?.status}>
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
