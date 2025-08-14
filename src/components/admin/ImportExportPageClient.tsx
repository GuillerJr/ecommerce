
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Download, FileDown, Upload } from "lucide-react";
import { Input } from '../ui/input';
import { exportProductsToXlsx, importProductStockFromXlsx, generateProductsXlsxTemplate, importProductsFromXlsx } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ImportExportPageClient() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImportingNew, setIsImportingNew] = useState(false);
    const [importNewFile, setImportNewFile] = useState<File | null>(null);

    const downloadFile = (base64Data: string, filename: string, type: string) => {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await exportProductsToXlsx();
            if (result.success && result.data) {
                downloadFile(result.data, 'products_export.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                toast({ title: 'Exportación Exitosa', description: 'El archivo XLSX de productos ha sido descargado.' });
            } else {
                throw new Error(result.message || 'No se pudo exportar.');
            }
        } catch (error) {
            toast({ title: 'Error de Exportación', description: error instanceof Error ? error.message : 'Ocurrió un error.', variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async () => {
        if (!importFile) {
            toast({ title: 'Ningún archivo seleccionado', description: 'Por favor, selecciona un archivo XLSX para importar.', variant: 'destructive' });
            return;
        }

        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const binaryStr = event.target?.result;
                if(typeof binaryStr === 'string'){
                    const base64Data = btoa(binaryStr);
                    const result = await importProductStockFromXlsx(base64Data);
                    if (result.success) {
                        toast({ title: 'Importación Exitosa', description: result.message });
                        router.refresh();
                    } else {
                        toast({ title: 'Error de Importación', description: result.message, variant: 'destructive' });
                    }
                }
                 setIsImporting(false);
            };
            reader.readAsBinaryString(importFile);
        } catch (error) {
            toast({ title: 'Error de Importación', description: error instanceof Error ? error.message : 'Ocurrió un error.', variant: 'destructive' });
            setIsImporting(false);
        }
    };
    
    const handleDownloadTemplate = async () => {
        const result = await generateProductsXlsxTemplate();
        if (result.success && result.data) {
            downloadFile(result.data, 'plantilla_productos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };
    
    const handleImportNewProducts = async () => {
        if (!importNewFile) {
            toast({ title: 'Ningún archivo seleccionado', variant: 'destructive' });
            return;
        }
        if (!user) return;
        setIsImportingNew(true);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const binaryStr = event.target?.result;
                if(typeof binaryStr === 'string'){
                    const base64Data = btoa(binaryStr);
                    const result = await importProductsFromXlsx(base64Data, user.id);
            
                    if (result.success) {
                        toast({ title: "Importación Exitosa", description: result.message, duration: 10000 });
                        router.refresh();
                    } else {
                        toast({ title: "Error de Importación", description: result.message, duration: 10000, variant: "destructive" });
                    }
                }
                setIsImportingNew(false);
                setImportNewFile(null);
            };
            reader.readAsBinaryString(importNewFile);

        } catch (error) {
             toast({ title: 'Error de Importación', description: error instanceof Error ? error.message : 'Ocurrió un error.', variant: 'destructive' });
             setIsImportingNew(false);
             setImportNewFile(null);
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-secondary p-3 rounded-full border">
                    <UploadCloud className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Importar y Exportar</h1>
                    <p className="text-muted-foreground">Gestiona el inventario y catálogo de productos masivamente mediante archivos XLSX.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Exportar Productos (para actualizar stock)</CardTitle>
                        <CardDescription>
                            Descarga un archivo XLSX con tus productos. El archivo incluirá las columnas `id`, `name`, y `stock`.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleExport} disabled={isExporting}>
                            <Download className="mr-2 h-4 w-4" />
                            {isExporting ? 'Exportando...' : 'Exportar Stock a XLSX'}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Importar Stock</CardTitle>
                        <CardDescription>
                            Sube el archivo XLSX que exportaste para actualizar el stock. El sistema usará `id` y `stock` e ignorará otras columnas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input 
                            type="file" 
                            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} 
                        />
                        <Button onClick={handleImport} disabled={isImporting || !importFile}>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            {isImporting ? 'Actualizando Stock...' : 'Actualizar Stock desde XLSX'}
                        </Button>
                    </CardContent>
                </Card>
                
                 <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Crear Productos Masivamente</CardTitle>
                        <CardDescription>
                           Utiliza una plantilla para subir múltiples productos nuevos a tu tienda de una sola vez. Las imágenes se deben añadir manualmente después.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="space-y-2">
                            <h4 className="font-medium">Paso 1: Descargar Plantilla</h4>
                            <p className="text-sm text-muted-foreground">Descarga la plantilla XLSX para asegurar que tus datos están en el formato correcto.</p>
                            <Button onClick={handleDownloadTemplate} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Descargar Plantilla</Button>
                        </div>
                        <div className="space-y-2">
                             <h4 className="font-medium">Paso 2: Subir Archivo</h4>
                             <p className="text-sm text-muted-foreground">Selecciona el archivo XLSX que has rellenado con los datos de tus productos.</p>
                            <Input 
                                type="file" 
                                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={(e) => setImportNewFile(e.target.files ? e.target.files[0] : null)}
                            />
                        </div>
                         <div className="space-y-2">
                             <h4 className="font-medium">Paso 3: Iniciar Importación</h4>
                             <p className="text-sm text-muted-foreground">Haz clic en el botón de abajo para comenzar el proceso de creación de productos.</p>
                            <Button onClick={handleImportNewProducts} disabled={isImportingNew || !importNewFile}>
                                <Upload className="mr-2 h-4 w-4"/>
                                {isImportingNew ? "Importando..." : "Importar y Crear Productos"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
