
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, PlusCircle, Trash2, Pencil, Home, Briefcase, Star, ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Address } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { addAddressAction, updateAddressAction, deleteAddressAction } from "@/lib/actions/users";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const dynamic = 'force-dynamic';

const addressSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  address: z.string().min(5, "La dirección es muy corta."),
  city: z.string().min(2, "La ciudad es muy corta."),
  postalCode: z.string().min(4, "El código postal es muy corto."),
  country: z.string().min(2, "El país es muy corto."),
  isDefault: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export default function DireccionesPage() {
    const { user, loading, updateUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

    const form = useForm<AddressFormValues>({
        resolver: zodResolver(addressSchema),
    });

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login?from=/direcciones');
        } else if (user) {
            setAddresses(user.addresses || []);
        }
    }, [user, loading, router]);
    
    useEffect(() => {
        if (isFormOpen) {
            form.reset(editingAddress || { name: '', address: '', city: '', postalCode: '', country: '', isDefault: false });
        }
    }, [isFormOpen, editingAddress, form]);


    if (loading || !user) {
        return <div className="flex h-dvh items-center justify-center">Cargando...</div>;
    }

    const handleFormSubmit = async (values: AddressFormValues) => {
        if (!user) return;
        
        if (editingAddress) {
            const result = await updateAddressAction(user.id, { ...editingAddress, ...values });
            if (result.success && result.user) {
              await updateUser(result.user);
              toast({ title: "Dirección actualizada" });
            } else {
              toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        } else {
            const result = await addAddressAction(user.id, values);
            if(result.success && result.user) {
              await updateUser(result.user);
              toast({ title: "Dirección añadida" });
            } else {
              toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        }
        
        setIsFormOpen(false);
        setEditingAddress(null);
    };
    
    const handleEdit = (address: Address) => {
        setEditingAddress(address);
        setIsFormOpen(true);
    };

    const handleDelete = (addressId: string) => {
        setDeletingAddressId(addressId);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (deletingAddressId && user) {
            const result = await deleteAddressAction(user.id, deletingAddressId);
            if (result.success && result.user) {
                await updateUser(result.user);
                toast({ title: "Dirección eliminada" });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        }
        setIsDeleteOpen(false);
        setDeletingAddressId(null);
    };
    
    const getAddressIcon = (name: string) => {
      if (name.toLowerCase().includes('casa')) return <Home className="h-5 w-5 text-muted-foreground" />;
      if (name.toLowerCase().includes('oficina') || name.toLowerCase().includes('trabajo')) return <Briefcase className="h-5 w-5 text-muted-foreground" />;
      return <MapPin className="h-5 w-5 text-muted-foreground" />;
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="font-headline text-3xl md:text-4xl font-bold">Mis Direcciones</h1>
                        <p className="text-lg text-muted-foreground">Gestiona tus direcciones de envío y facturación.</p>
                    </div>
                    <Button onClick={() => { setEditingAddress(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Dirección
                    </Button>
                </div>
                
                {addresses.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        {addresses.map(addr => (
                            <Card key={addr.id} className={cn("group relative", addr.isDefault && "border-primary")}>
                                <CardContent className="p-4 flex items-start gap-4">
                                     <div className="flex-shrink-0 pt-1">
                                        {getAddressIcon(addr.name)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-base">{addr.name}</h3>
                                                {addr.isDefault && <Badge variant="outline" className="text-xs border-primary text-primary"><Star className="h-3 w-3 mr-1.5"/> Predeterminada</Badge>}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(addr)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(addr.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-muted-foreground text-sm space-y-0.5 mt-1">
                                            <p>{addr.address}</p>
                                            <p>{addr.city}, {addr.postalCode}</p>
                                            <p>{addr.country}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="text-center py-12">
                            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-semibold text-foreground">Aún no hay direcciones</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Añade una dirección para empezar.</p>
                        </CardContent>
                    </Card>
                )}
                 <div className="mt-8 flex justify-center">
                    <Button asChild variant="outline">
                        <Link href="/perfil">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Perfil
                        </Link>
                    </Button>
                </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? 'Editar Dirección' : 'Añadir Nueva Dirección'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nombre (ej. Casa, Oficina)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="city" render={({ field }) => (
                                    <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="postalCode" render={({ field }) => (
                                    <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="country" render={({ field }) => (
                                <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="isDefault" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5"><FormLabel>Establecer como predeterminada</FormLabel></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará la dirección permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
