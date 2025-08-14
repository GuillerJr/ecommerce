/**
 * @fileoverview Componente del lado del cliente para la página de historial de pedidos.
 * Muestra la lista de pedidos del usuario, permite ver detalles y gestiona el estado
 * de carga y la autenticación del usuario.
 */

'use client';

import { useState, useEffect, Fragment, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, LogIn, Truck, CheckCircle2, CircleDotDashed, ArrowLeft, User as UserIcon, Mail, Phone, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Order, OrderStatus, Customization, Product, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ORDERS_PER_PAGE = 5;

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

const CustomizationDetails = ({ customization }: { customization?: Customization }) => {
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

interface PedidosPageClientProps {
    initialOrders: Order[];
    initialProducts: Product[];
}

export default function PedidosPageClient({ initialOrders, initialProducts }: PedidosPageClientProps) {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filtra los pedidos para mostrar solo los del usuario actual.
  const userOrders = useMemo(() => {
    if (!user) return [];
    return orders.filter(o => o.userId === user.id);
  }, [orders, user]);

  const totalPages = Math.ceil(userOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = useMemo(() => userOrders.slice(
      (currentPage - 1) * ORDERS_PER_PAGE,
      currentPage * ORDERS_PER_PAGE
  ), [userOrders, currentPage]);

  const getProductById = (id: string) => products.find(p => p.id === id);
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <Package className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold mt-4">Consulta tu historial de pedidos</h1>
        <p className="text-muted-foreground mt-2">Inicia sesión para ver los pedidos que has realizado.</p>
        <Button asChild className="mt-6">
          <Link href="/login?from=/pedidos">
            <LogIn className="mr-2" />
            Iniciar Sesión
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Mis Pedidos</CardTitle>
            <CardDescription>Aquí puedes ver y rastrear el historial de tus pedidos.</CardDescription>
          </CardHeader>
          <CardContent>
            {userOrders.length > 0 ? (
              <div className="space-y-4">
                {paginatedOrders.map(order => (
                  <Card key={order.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="grid gap-1">
                      <p className="font-semibold">Pedido #{order.id.substring(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">Fecha: {format(new Date(order.date), 'dd/MM/yyyy', { locale: es })}</p>
                      <p className="text-sm text-muted-foreground">Total: ${order.total.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <Badge variant={getStatusBadgeVariant(order.status)} className="self-start sm:self-auto">{order.status}</Badge>
                      <Dialog>
                          <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>Ver Detalles</Button>
                          </DialogTrigger>
                           <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                                      <DialogTitle>Detalles del Pedido #{selectedOrder?.id.substring(0, 8)}</DialogTitle>
                                      {selectedOrder && <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="mt-2 sm:mt-0">{selectedOrder.status}</Badge>}
                                    </div>
                                    <DialogDescription>
                                        Fecha del pedido: {selectedOrder && format(new Date(selectedOrder.date), "PPP p", { locale: es })}.
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
                                                          <Image src={product.image} alt={product.name} width={56} height={56} className="rounded-md border object-cover flex-shrink-0" />
                                                          <div className="flex-1">
                                                              <Link href={`/product/${product.id}`} className="font-medium text-sm hover:underline">{product.name}</Link>
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
                          </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">No hay pedidos</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Aún no has realizado ningún pedido.</p>
              </div>
            )}
             {totalPages > 1 && (
                <div className="flex justify-center pt-6">
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

        <div className="mt-6 flex justify-center">
            <Button asChild variant="outline">
                <Link href="/perfil">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Perfil
                </Link>
            </Button>
        </div>

      </div>
    </div>
  );
}
