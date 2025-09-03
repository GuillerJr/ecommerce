
'use client';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, Activity, Ticket, Users, Star, TrendingUp, AlertTriangle, ArrowUpRight, ClipboardList, Flame } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { OrderStatus, Product, Order } from "@/types";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardPageClientProps {
    stats: {
        totalRevenue: number;
        revenuePercentageChange: number | null;
        orderCount: number;
        pendingOrderCount: number;
        productCount: number;
        activeCouponCount: number;
        totalCouponCount: number;
        userCount: number;
        reviewCount: number;
    };
    recentOrders: Order[];
    topSellingProducts: { product: Product; quantity: number }[];
    lowStockProducts: Product[];
    monthlySalesData: { name: string, total: number }[];
}

export default function DashboardPageClient({ stats, recentOrders, topSellingProducts, lowStockProducts, monthlySalesData }: DashboardPageClientProps) {
    
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
    
    const chartConfig = {
      total: { label: "Ventas", color: "hsl(var(--primary))" },
    } satisfies ChartConfig;

    return (
        <div className="p-4 md:p-8 flex-1">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                        {stats.revenuePercentageChange !== null ? (
                            <p className="text-xs text-muted-foreground">
                                <span className={stats.revenuePercentageChange >= 0 ? "text-green-600" : "text-destructive"}>
                                    {stats.revenuePercentageChange >= 0 ? '+' : ''}
                                    {stats.revenuePercentageChange.toFixed(1)}%
                                </span>
                                {' '}desde el mes pasado
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Sin datos del mes anterior
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.orderCount}</div>
                        <p className="text-xs text-muted-foreground">{stats.pendingOrderCount} pendientes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Productos</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.productCount}</div>
                        <p className="text-xs text-muted-foreground">Actualmente en la tienda</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cupones Activos</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeCouponCount}</div>
                        <p className="text-xs text-muted-foreground">de {stats.totalCouponCount} en total</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.userCount}</div>
                        <p className="text-xs text-muted-foreground">Registrados en la tienda</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Reseñas</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.reviewCount}</div>
                        <p className="text-xs text-muted-foreground">En todos los productos</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                            Ventas de los Últimos 12 Meses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       {monthlySalesData.length > 0 ? (
                           <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                             <AreaChart data={monthlySalesData}>
                                <defs>
                                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent formatter={(value) => `$${(value as number).toFixed(2)}`} indicator="dot" />}
                                />
                                <Area dataKey="total" type="natural" fill="url(#fillTotal)" stroke="var(--color-total)" stackId="a" />
                             </AreaChart>
                           </ChartContainer>
                        ) : (
                            <Skeleton className="min-h-[250px] w-full" />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-muted-foreground" />
                            Pedidos Recientes
                        </CardTitle>
                        <CardDescription>
                            Los últimos 5 pedidos realizados en la tienda.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentOrders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <div className="font-medium">{order.customerName}</div>
                                            <div className="hidden text-sm text-muted-foreground md:inline">${order.total.toFixed(2)}</div>
                                        </TableCell>
                                        <TableCell className="text-right"><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Button asChild size="sm" className="mt-4 w-full">
                            <Link href="/admin/pedidos">
                                Ver todos los pedidos
                                <ArrowUpRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="xl:col-span-2">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-muted-foreground" />
                            Productos Más Vendidos
                        </CardTitle>
                        <CardDescription>
                            Los productos con más unidades vendidas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {topSellingProducts.map(({ product, quantity }) => (
                            <div key={product.id} className="flex items-center gap-4">
                                <Avatar className="hidden h-12 w-12 sm:flex rounded-md bg-secondary/50">
                                    <AvatarImage src={product.image} alt={product.name} className="object-contain p-1" />
                                    <AvatarFallback>{product.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">{quantity} unidades vendidas</p>
                                </div>
                                <div className="ml-auto font-medium">${product.price.toFixed(2)}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive"/>Poco Stock</CardTitle>
                        <CardDescription>
                           Productos con 5 o menos unidades en stock.
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="grid gap-6">
                        {lowStockProducts.length > 0 ? lowStockProducts.map(product => (
                            <div key={product.id} className="flex items-center gap-4">
                                <div className="grid gap-1 flex-1 min-w-0">
                                    <Link href={`/admin/productos`} className="text-sm font-medium leading-none truncate hover:underline">{product.name}</Link>
                                </div>
                                <Badge variant="destructive" className="ml-auto">{product.stock}</Badge>
                            </div>
                        )) : <p className="text-sm text-muted-foreground text-center">No hay productos con poco stock.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
