
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { User as UserIcon, MapPin, Heart, Package, Settings, ChevronRight, Edit, History, Repeat, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const dynamic = 'force-dynamic';

const navItems = [
    { href: '/pedidos', label: 'Mis Pedidos', icon: Package },
    { href: '/comprar-nuevamente', label: 'Comprar Nuevamente', icon: Repeat },
    { href: '/direcciones', label: 'Direcciones', icon: MapPin },
    { href: '/favoritos', label: 'Mis Favoritos', icon: Heart },
    { href: '/historial-busqueda', label: 'Vistos Recientemente', icon: History },
    { href: '/sugerencias', label: 'Sugerencias', icon: Lightbulb },
    { href: '/configuracion', label: 'Configuración', icon: Settings },
];

const countryCodes = [
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+34', name: 'España', flag: '🇪🇸' },
];

const profileSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  email: z.string().email("Correo electrónico inválido."),
  identification: z.string().min(5, 'La identificación debe tener al menos 5 caracteres.'),
  countryCode: z.string(),
  phoneNumber: z.string().min(7, 'El número de teléfono es muy corto.'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.newPassword && data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
            code: "custom",
            message: "Las nuevas contraseñas no coinciden.",
            path: ["confirmPassword"],
        });
    }
    if (data.newPassword && !data.currentPassword) {
        ctx.addIssue({
            code: "custom",
            message: "Por favor, introduce tu contraseña actual.",
            path: ["currentPassword"],
        });
    }
});

type ProfileFormValues = z.infer<typeof profileSchema>;


export default function PerfilPage() {
  const { user, loading, logout, updateUser, updatePassword } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      identification: user?.identification || "",
      countryCode: user?.phone?.countryCode || "+593",
      phoneNumber: user?.phone?.number || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    if (user && isEditDialogOpen) {
      form.reset({
        name: user.name,
        email: user.email,
        identification: user.identification || "",
        countryCode: user.phone?.countryCode || "+593",
        phoneNumber: user.phone?.number || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user, loading, router, form, isEditDialogOpen]);

  if (loading || !user) {
    return <div className="flex h-dvh items-center justify-center">Cargando...</div>;
  }

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    let somethingChanged = false;
    let anyError = false;

    // Update profile info
    const infoChanged = data.name !== user.name ||
                        data.email !== user.email ||
                        data.identification !== (user.identification || "") ||
                        data.countryCode !== (user.phone?.countryCode || "") ||
                        data.phoneNumber !== (user.phone?.number || "");

    if (infoChanged) {
      somethingChanged = true;
      const updatedUserData: User = { 
          ...user, 
          name: data.name, 
          email: data.email,
          identification: data.identification,
          phone: {
              countryCode: data.countryCode,
              number: data.phoneNumber
          }
      };
      const result = await updateUser(updatedUserData);
      if (!result.success) {
        anyError = true;
        toast({ title: "Error al actualizar perfil", description: result.message || "No se pudo guardar la información.", variant: "destructive" });
      }
    }

    // Update password
    if (data.newPassword && data.currentPassword) {
      somethingChanged = true;
      const result = await updatePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      if (!result.success) {
        anyError = true;
        toast({ title: "Error al cambiar contraseña", description: result.message, variant: "destructive" });
      }
    }
    
    if (somethingChanged && !anyError) {
        toast({ title: "Perfil Actualizado", description: "Tus cambios han sido guardados." });
        setIsEditDialogOpen(false);
    } else if (!somethingChanged) {
        // No changes were made
        setIsEditDialogOpen(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <h1 className="font-headline text-3xl md:text-4xl font-bold">Mi Cuenta</h1>
            <p className="text-lg text-muted-foreground">Bienvenido de nuevo, {user.name.split(' ')[0]}.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary">
                                    <AvatarFallback className="bg-muted">
                                        <UserIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-xl sm:text-2xl">{user.name}</CardTitle>
                                    <CardDescription>{user.email}</CardDescription>
                                    <p className="text-sm text-primary font-medium mt-1 capitalize">{user.role}</p>
                                </div>
                            </div>
                             <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Editar Perfil
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Editar Perfil</DialogTitle>
                                        <DialogDescription>Actualiza tu información personal y contraseña.</DialogDescription>
                                    </DialogHeader>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                            <h3 className="text-sm font-semibold text-foreground">Información Personal</h3>
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nombre</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Correo Electrónico</FormLabel>
                                                    <FormControl><Input type="email" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="identification"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Identificación (Cédula/DNI)</FormLabel>
                                                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormItem>
                                                <FormLabel>Número de Teléfono</FormLabel>
                                                <div className="flex gap-2">
                                                    <FormField
                                                    control={form.control}
                                                    name="countryCode"
                                                    render={({ field }) => (
                                                        <FormItem className="w-1/3">
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                            {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                        </FormItem>
                                                    )}
                                                    />
                                                    <FormField
                                                    control={form.control}
                                                    name="phoneNumber"
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input type="tel" {...field} value={field.value ?? ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                        </FormItem>
                                                    )}
                                                    />
                                                </div>
                                            </FormItem>
                                            <Separator className="my-6"/>
                                            <h3 className="text-sm font-semibold text-foreground">Cambiar Contraseña</h3>
                                            <FormField
                                                control={form.control}
                                                name="currentPassword"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contraseña Actual</FormLabel>
                                                    <FormControl><Input type="password" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="newPassword"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nueva Contraseña</FormLabel>
                                                    <FormControl><Input type="password" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="confirmPassword"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                                                    <FormControl><Input type="password" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                                                <Button type="submit">Guardar Cambios</Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p>Gestiona la información de tu perfil y la configuración de tu cuenta desde las opciones del menú.</p>
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Menú de Cuenta</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <ul className="divide-y">
                         {navItems.map((item) => (
                           <li key={item.href}>
                             <Link href={item.href} className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
                                <div className="flex items-center gap-4">
                                  <item.icon className="h-5 w-5 text-muted-foreground" />
                                  <span className="font-medium">{item.label}</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                             </Link>
                           </li>
                         ))}
                       </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
