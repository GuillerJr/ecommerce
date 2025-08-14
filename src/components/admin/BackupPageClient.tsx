
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Loader2, Archive } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createBackupAction } from '@/lib/actions';
import type { Backup } from '@/types';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface BackupPageClientProps {
    initialBackups: Backup[];
}

export default function BackupPageClient({ initialBackups }: BackupPageClientProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateBackup = async () => {
        setIsLoading(true);
        try {
            const result = await createBackupAction();
            
            if (result.success && result.content && result.filename) {
                // Content is plain SQL text, create a Blob for it
                const blob = new Blob([result.content], { type: 'application/sql' });
                
                // Create a link and trigger download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                toast({
                    title: "Backup Creado y Descargado",
                    description: `El archivo ${result.filename} ha sido generado.`,
                });
                // Refresh the page to show the new backup in the history
                router.refresh();
            } else {
                throw new Error(result.message || 'No se pudo crear el backup.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
            toast({
                title: "Error al crear Backup",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-secondary p-3 rounded-full border">
                        <Database className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Gestión de Backups</h1>
                        <p className="text-muted-foreground">Crea y descarga una copia de seguridad de todos los datos de tu tienda.</p>
                    </div>
                </div>
                <Button onClick={handleCreateBackup} disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Archive className="mr-2 h-4 w-4" />
                    )}
                    Crear Nuevo Backup
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Backups</CardTitle>
                    <CardDescription>
                        Registro de los backups creados anteriormente. Cada vez que creas uno nuevo, se descargará automáticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha y Hora</TableHead>
                                <TableHead>Nombre del Archivo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialBackups.length > 0 ? (
                                initialBackups.map((backup) => (
                                    <TableRow key={backup.id}>
                                        <TableCell>{format(new Date(backup.date), 'dd/MM/yyyy, HH:mm:ss')}</TableCell>
                                        <TableCell className="font-mono">{backup.filename}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24">
                                        No hay backups registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
