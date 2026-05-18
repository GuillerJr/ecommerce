
'use client';

import { useState, useMemo, useEffect } from "react";
import type { ActivityLog, User, StoreConfig } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileClock, FileDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStoreConfigAction } from "@/lib/actions";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

const ITEMS_PER_PAGE = 20;

interface ActivityLogPageClientProps {
    initialLogs: ActivityLog[];
    allUsers: User[];
}

const translateAction = (action: string): string => {
    const translations: Record<string, string> = {
        create: 'Crear',
        update: 'Actualizar',
        delete: 'Eliminar',
        login: 'Inicio de Sesión',
        update_status: 'Actualizar Estado',
        update_team_status: 'Actualizar Estado de Equipo',
        generate_matches: 'Generar Partidos',
        update_match_details: 'Actualizar Detalles de Partido',
        stock_add: 'Añadir Stock',
        backup_create: 'Crear Backup',
    };
    return translations[action] || action;
};

const translateEntityType = (entityType: string): string => {
    const translations: Record<string, string> = {
        Product: 'Producto',
        User: 'Usuario',
        Order: 'Pedido',
        Category: 'Categoría',
        Subcategory: 'Subcategoría',
        Brand: 'Marca',
        Discount: 'Descuento',
        Coupon: 'Cupón',
        Giveaway: 'Sorteo',
        Role: 'Rol',
        StoreConfig: 'Configuración de Tienda',
        NosotrosPage: 'Página Nosotros',
    };
    return translations[entityType] || entityType;
};

export default function ActivityLogPageClient({ initialLogs, allUsers }: ActivityLogPageClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [userFilter, setUserFilter] = useState<string>("all");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

     useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) {
                setStoreConfig(result.config);
            }
        });
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, userFilter, actionFilter]);

    const filteredLogs = useMemo(() => {
        return initialLogs.filter(log => {
            const userMatch = userFilter === 'all' || log.userId === userFilter;
            const actionMatch = actionFilter === 'all' || log.action === actionFilter;
            const searchMatch = searchTerm === "" || 
                                log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                log.entityId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase());
            return userMatch && actionMatch && searchMatch;
        });
    }, [initialLogs, userFilter, actionFilter, searchTerm]);

    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = useMemo(() => filteredLogs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredLogs, currentPage]);

    const allActions = useMemo(() => [...new Set(initialLogs.map(log => log.action))], [initialLogs]);

    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredLogs.map(log => [
            format(new Date(log.createdAt), 'dd/MM/yy HH:mm'),
            log.userName,
            translateAction(log.action),
            translateEntityType(log.entityType),
            log.entityId || '-',
            JSON.stringify(log.details) || '{}',
        ]);
        const tableHeaders = ["Fecha", "Usuario", "Acción", "Entidad", "ID Entidad", "Detalles"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Actividad", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        const filtersApplied = [
            `Usuario: ${userFilter === 'all' ? 'Todos' : allUsers.find(u => u.id === userFilter)?.name}`,
            `Acción: ${actionFilter === 'all' ? 'Todas' : actionFilter}`,
            `Búsqueda: "${searchTerm || 'Ninguna'}"`
        ].join(' | ');

        doc.text(`Filtros Aplicados: ${filtersApplied}`, 14, 40);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 44);

        autoTable(doc, {
            startY: 50,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 22, 22] },
            styles: { font: 'helvetica', fontSize: 8 },
            columnStyles: {
              5: { cellWidth: 50 },
            }
        });

        doc.save(`reporte_actividad_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="bg-secondary p-3 rounded-full border">
                      <FileClock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Historial de Actividad</h1>
                        <p className="text-muted-foreground">Registro de acciones importantes en el panel de administración.</p>
                    </div>
                </div>
                 <Button onClick={handleExportPDF} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar a PDF
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Registros de Actividad</CardTitle>
                    <CardDescription>Filtra y busca para encontrar registros específicos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <Input 
                            placeholder="Buscar en todos los campos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger className="sm:w-[200px]">
                                <SelectValue placeholder="Filtrar por usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los usuarios</SelectItem>
                                {allUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="sm:w-[180px]">
                                <SelectValue placeholder="Filtrar por acción" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las acciones</SelectItem>
                                {allActions.map((action) => (
                                    <SelectItem key={action} value={action}>
                                        {translateAction(action)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Acción</TableHead>
                                    <TableHead>Entidad</TableHead>
                                    <TableHead>ID Entidad</TableHead>
                                    <TableHead className="text-right">Detalles</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(new Date(log.createdAt), 'Pp', { locale: es })}</TableCell>
                                        <TableCell className="font-medium">{log.userName}</TableCell>
                                        <TableCell>{translateAction(log.action)}</TableCell>
                                        <TableCell>{translateEntityType(log.entityType)}</TableCell>
                                        <TableCell className="font-mono text-xs">{log.entityId || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {log.details && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Detalles del Registro</DialogTitle>
                                                            <DialogDescription>ID del Log: {log.id}</DialogDescription>
                                                        </DialogHeader>
                                                        <pre className="mt-2 w-full overflow-x-auto rounded-md bg-muted p-4 text-sm">
                                                            <code>{JSON.stringify(log.details, null, 2)}</code>
                                                        </pre>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            No se encontraron registros.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-6">
                            <div className="text-xs text-muted-foreground">
                                Mostrando <strong>{paginatedLogs.length}</strong> de <strong>{filteredLogs.length}</strong> registros.
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
        </div>
    );
}
