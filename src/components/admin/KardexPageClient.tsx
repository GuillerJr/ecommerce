
'use client';

import { useState, useMemo, useEffect } from "react";
import type { KardexEntry, Product, StoreConfig } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { History, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { format } from "date-fns";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStoreConfigAction } from "@/lib/actions";

const ITEMS_PER_PAGE = 15;

interface KardexPageClientProps {
    initialKardexEntries: KardexEntry[];
    allProducts: Product[];
}

export default function KardexPageClient({ initialKardexEntries, allProducts }: KardexPageClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProductId, setSelectedProductId] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<'all' | 'Entrada' | 'Salida'>("all");
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
    }, [searchTerm, selectedProductId, typeFilter]);

    const filteredEntries = useMemo(() => {
        const productMap = new Map(allProducts.map(p => [p.id, p]));
        return initialKardexEntries.filter(entry => {
            const product = productMap.get(entry.productId);
            const productMatch = selectedProductId === 'all' || entry.productId === selectedProductId;
            const typeMatch = typeFilter === 'all' || entry.type === typeFilter;
            const searchMatch = searchTerm === "" || 
                                (product && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                entry.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            return productMatch && searchMatch && typeMatch;
        });
    }, [initialKardexEntries, selectedProductId, searchTerm, typeFilter, allProducts]);

    const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
    const paginatedEntries = useMemo(() => filteredEntries.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredEntries, currentPage]);

    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredEntries.map(entry => [
            format(new Date(entry.date), 'dd/MM/yyyy HH:mm'),
            entry.productName,
            entry.type,
            entry.quantity.toString(),
            entry.balance.toString(),
            entry.notes || '',
        ]);
        const tableHeaders = ["Fecha", "Producto", "Tipo", "Cantidad", "Saldo", "Notas"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Kardex", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        const filtersApplied = [
            `Producto: ${selectedProductId === 'all' ? 'Todos' : allProducts.find(p => p.id === selectedProductId)?.name}`,
            `Tipo: ${typeFilter === 'all' ? 'Todos' : typeFilter}`,
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
        });

        doc.save(`reporte_kardex_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="bg-secondary p-3 rounded-full border">
                      <History className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Kardex de Inventario</h1>
                        <p className="text-muted-foreground">Registro de todas las entradas y salidas de productos.</p>
                    </div>
                </div>
                 <Button onClick={handleExportPDF} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar a PDF
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Movimientos de Inventario</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <Input 
                            placeholder="Buscar por producto o nota..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger className="sm:w-[250px]">
                                <SelectValue placeholder="Filtrar por producto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los productos</SelectItem>
                                {allProducts.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                        {product.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | 'Entrada' | 'Salida')}>
                            <SelectTrigger className="sm:w-[180px]">
                                <SelectValue placeholder="Filtrar por tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                <SelectItem value="Entrada">Entrada</SelectItem>
                                <SelectItem value="Salida">Salida</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Saldo</TableHead>
                                    <TableHead>Notas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedEntries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell className="font-medium">{entry.productName}</TableCell>
                                        <TableCell>
                                            <Badge variant={entry.type === 'Entrada' ? 'default' : 'secondary'}>
                                                {entry.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-semibold ${entry.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                            {entry.type === 'Entrada' ? '+' : '-'}{entry.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{entry.balance}</TableCell>
                                        <TableCell className="text-muted-foreground">{entry.notes}</TableCell>
                                    </TableRow>
                                ))}
                                {filteredEntries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            No se encontraron movimientos.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-6">
                            <div className="text-xs text-muted-foreground">
                                Mostrando <strong>{paginatedEntries.length}</strong> de <strong>{filteredEntries.length}</strong> movimientos.
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
