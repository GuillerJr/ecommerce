
/**
 * @fileoverview Página del lado del servidor para el Dashboard de administración.
 * Se encarga de recopilar y pre-calcular todas las estadísticas y datos necesarios
 * para mostrar en el panel principal del administrador.
 */

import { getProductsFromDb } from "@/lib/data/products";
import { getCoupons } from "@/lib/data/coupons";
import { getOrdersFromDb } from "@/lib/data/orders";
import { getUsers } from "@/lib/data/users";
import { getAllReviews } from "@/lib/data/reviews";
import DashboardPageClient from "@/components/admin/DashboardPageClient";
import type { Product } from "@/types";
import { format, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';


export const dynamic = 'force-dynamic';

/**
 * Componente de página para el Dashboard de administración.
 * Realiza el fetching y procesamiento de datos en el servidor para optimizar la carga.
 * 
 * @returns {Promise<JSX.Element>} El componente del Dashboard con los datos pre-cargados.
 */
export default async function DashboardPage() {
    // Obtención de datos brutos desde la base de datos.
    const products = await getProductsFromDb();
    const coupons = await getCoupons();
    const orders = await getOrdersFromDb();
    const users = await getUsers();
    const reviews = await getAllReviews();

    // Filtrar pedidos completados para calcular ingresos.
    const completedOrders = orders.filter(o => o.status === 'Entregado');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);

    // Lógica para calcular ingresos del mes actual y del mes anterior.
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const previousMonth = prevMonthDate.getMonth();
    const previousMonthYear = prevMonthDate.getFullYear();

    const currentMonthRevenue = completedOrders
        .filter(o => {
            const orderDate = new Date(o.date);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        })
        .reduce((sum, order) => sum + order.total, 0);

    const previousMonthRevenue = completedOrders
        .filter(o => {
            const orderDate = new Date(o.date);
            return orderDate.getMonth() === previousMonth && orderDate.getFullYear() === previousMonthYear;
        })
        .reduce((sum, order) => sum + order.total, 0);

    // Cálculo del cambio porcentual en los ingresos.
    let revenuePercentageChange: number | null = null;
    if (previousMonthRevenue > 0) {
        revenuePercentageChange = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
        // Si hay ingresos este mes pero no el anterior, el cliente lo manejará como nueva actividad.
    }
    
    // Obtener los 5 pedidos más recientes.
    const recentOrders = orders.slice(0, 5);

    // Función asíncrona para calcular los productos más vendidos.
    const topSellingProducts = (() => {
        const productSales: { [key: string]: { product: Product; quantity: number } } = {};
        const productMap = new Map(products.map(p => [p.id, p]));

        for(const order of orders) {
            for(const item of order.items) {
                const product = productMap.get(item.productId);
                if (product) {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = { product, quantity: 0 };
                    }
                    productSales[item.productId].quantity += item.quantity;
                }
            }
        }

        return Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    })();
    
    // Filtrar productos con bajo stock.
    const lowStockProducts = products
            .filter(p => p.saleType === 'stock' && p.stock > 0 && p.stock <= 5)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 5);
            
    // Lógica para calcular ventas de los últimos 12 meses
    const monthlySalesData = (() => {
        const salesByMonth: { [key: string]: number } = {};
        completedOrders.forEach(order => {
            const monthKey = format(new Date(order.date), 'yyyy-MM');
            salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + order.total;
        });
        
        const last12Months = Array.from({ length: 12 }).map((_, i) => {
            return startOfMonth(subMonths(now, i));
        }).reverse();
        
        return last12Months.map(date => {
            const monthKey = format(date, 'yyyy-MM');
            return {
                name: format(date, 'MMM yy', { locale: es }),
                total: salesByMonth[monthKey] || 0
            };
        });
    })();

    // Agrupar todas las estadísticas en un solo objeto para pasarlo como prop.
    const stats = {
        totalRevenue,
        revenuePercentageChange,
        orderCount: orders.length,
        pendingOrderCount: orders.filter(o => o.status === 'Pendiente' || o.status === 'Procesando').length,
        productCount: products.filter(p => p.status === 'Activo').length,
        activeCouponCount: coupons.filter(c => c.status === 'Activo').length,
        totalCouponCount: coupons.length,
        userCount: users.filter(u => u.status === 'Activo').length,
        reviewCount: reviews.filter(r => r.status === 'Visible').length,
    };

    // Renderizar el componente cliente con todos los datos procesados.
    return (
        <DashboardPageClient
            stats={stats}
            recentOrders={recentOrders}
            topSellingProducts={topSellingProducts}
            lowStockProducts={lowStockProducts}
            monthlySalesData={monthlySalesData}
        />
    );
}
