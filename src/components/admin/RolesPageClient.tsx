

'use client';

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, UserCog, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Role } from "@/types";
import { useRouter } from "next/navigation";
import { addRoleAction, updateRoleAction } from "@/lib/actions";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const permissionList = [
    { id: 'view_dashboard', label: 'Ver Dashboard' },
    { id: 'manage_pos', label: 'Gestionar Punto de Venta (POS)' },
    { id: 'manage_orders', label: 'Gestionar Pedidos' },
    { id: 'manage_products', label: 'Gestionar Productos' },
    { id: 'manage_inventory', label: 'Gestionar Inventario (Añadir Stock)' },
    { id: 'manage_import_export', label: 'Gestionar Importar/Exportar' },
    { id: 'manage_categories', label: 'Gestionar Categorías, Subcategorías y Marcas' },
    { id: 'manage_discounts', label: 'Gestionar Descuentos y Cupones' },
    { id: 'manage_giveaways', label: 'Gestionar Sorteos' },
    { id: 'manage_users', label: 'Gestionar Usuarios' },
    { id: 'manage_roles', label: 'Gestionar Roles y Permisos' },
    { id: 'manage_reviews', label: 'Gestionar Reseñas' },
    { id: 'view_kardex', label: 'Ver Kardex' },
    { id: 'view_activity', label: 'Ver Actividad' },
    { id: 'manage_backups', label: 'Gestionar Backups' },
    { id: 'manage_store_settings', label: 'Gestionar Configuración de Tienda y Página Nosotros' },
];

const permissionsSchema = z.object(
  permissionList.reduce((acc, p) => {
    acc[p.id] = z.boolean().default(false);
    return acc;
  }, {} as Record<string, z.ZodDefault<z.ZodBoolean>>)
).merge(z.object({ all: z.boolean().default(false) })).default({});

const roleSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  permissions: permissionsSchema,
  status: z.enum(['Activo', 'Inactivo']),
});


type RoleFormValues = z.infer<typeof roleSchema>;

interface RolesPageClientProps {
    initialRoles: Role[];
}

export default function RolesPageClient({ initialRoles }: RolesPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [roles, setRoles] = useState<Role[]>(initialRoles);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleToToggle, setRoleToToggle] = useState<Role | null>(null);
    const [activeTab, setActiveTab] = useState("active");

    useEffect(() => { 
        setRoles(initialRoles); 
    }, [initialRoles]);

    const filteredRoles = useMemo(() => {
        return roles.filter(role => 
            activeTab === 'active' ? role.status === 'Activo' : role.status === 'Inactivo'
        );
    }, [roles, activeTab]);

    const form = useForm<RoleFormValues>({
      resolver: zodResolver(roleSchema),
      defaultValues: { name: "", permissions: { all: false }, status: 'Activo' },
    });

    useEffect(() => {
        if (isFormOpen) {
            if (editingRole) {
                // Ensure all possible permissions are initialized in the form state
                const currentPermissions = permissionList.reduce((acc, p) => {
                    acc[p.id] = editingRole.permissions?.[p.id as keyof typeof editingRole.permissions] || false;
                    return acc;
                }, {} as Record<string, boolean>);
                currentPermissions.all = editingRole.permissions?.all || false;

                form.reset({
                    name: editingRole.name,
                    permissions: currentPermissions as any,
                    status: editingRole.status,
                });
            } else {
                form.reset({ name: "", permissions: { all: false }, status: 'Activo' });
            }
        }
    }, [editingRole, isFormOpen, form]);


    const handleCreate = () => {
      setEditingRole(null);
      setIsFormOpen(true);
    };
    
    const handleEdit = (role: Role) => {
      if (role.name === 'admin' || role.name === 'user') {
          toast({ title: 'No se pueden editar los roles base', variant: 'destructive' });
          return;
      }
      setEditingRole(role);
      setIsFormOpen(true);
    };
    
    const handleToggleStatus = (role: Role) => {
      if (role.name === 'admin') {
          toast({ title: 'El rol de admin no puede ser desactivado.', variant: 'destructive' });
          return;
      }
      setRoleToToggle(role);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
        if (!roleToToggle || !user) return;

        const newStatus = roleToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
        const result = await updateRoleAction({ ...roleToToggle, status: newStatus }, user.id);
        
        if (result.success) {
            toast({ title: `Rol ${newStatus.toLowerCase()}.` });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setRoleToToggle(null);
        setIsConfirmOpen(false);
    };

    const onSubmit = async (data: RoleFormValues) => {
        if (!user || (!user.permissions?.all && !user.permissions?.manage_roles)) {
            toast({ title: "No autorizado", description: "No tienes permisos para realizar esta acción.", variant: "destructive" });
            return;
        }

        const roleData = data as Omit<Role, 'id'>;
        const action = editingRole 
            ? updateRoleAction({ ...editingRole, ...roleData }, user.id) 
            : addRoleAction(roleData, user.id);

        const result = await action;
        if(result.success) {
            toast({ title: editingRole ? "Rol actualizado" : "Rol creado" });
            router.refresh();
            setIsFormOpen(false);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };
    
    const getPermissionLabels = (permissions: Role['permissions']): string => {
        if (permissions?.all) {
            return 'Todos los permisos';
        }
        const activePermissionLabels = permissionList
            .filter(p => permissions?.[p.id as keyof typeof permissions])
            .map(p => p.label);

        if (activePermissionLabels.length === 0) {
            return 'Sin permisos asignados';
        }
        return activePermissionLabels.join(', ');
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-secondary p-3 rounded-full border">
                        <UserCog className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Roles y Permisos</h1>
                        <p className="text-muted-foreground">Define roles para asignar permisos de acceso a los usuarios.</p>
                    </div>
                </div>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Rol
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Roles Definidos</CardTitle>
                    <CardDescription>Roles base como 'admin' y 'user' no pueden ser modificados o eliminados.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                        <TabsList>
                            <TabsTrigger value="active">Activos</TabsTrigger>
                            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Rol</TableHead>
                                <TableHead>Permisos</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRoles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium capitalize">{role.name}</TableCell>
                                    <TableCell>
                                        <p className="text-sm text-muted-foreground truncate max-w-md" title={getPermissionLabels(role.permissions)}>
                                            {getPermissionLabels(role.permissions)}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={role.status === 'Activo' ? 'default' : 'secondary'}>{role.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {(role.name !== 'admin' && role.name !== 'user') && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(role)}>
                                                        <Pencil className="mr-2 h-4 w-4"/> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleToggleStatus(role)}>
                                                        {role.status === 'Activo' ? <Archive className="mr-2 h-4 w-4"/> : <ArchiveRestore className="mr-2 h-4 w-4"/>}
                                                        {role.status === 'Activo' ? 'Desactivar' : 'Activar'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingRole ? "Editar" : "Crear"} Rol</DialogTitle>
                  <DialogDescriptionComponent>
                    Define el nombre y los permisos para este rol.
                  </DialogDescriptionComponent>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre del Rol</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormItem>
                         <FormLabel>Permisos</FormLabel>
                         <ScrollArea className="h-60 w-full rounded-md border p-4">
                             {permissionList.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name={`permissions.${item.id as keyof RoleFormValues['permissions']}`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal text-sm">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                             ))}
                         </ScrollArea>
                     </FormItem>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                      <Button type="submit">Guardar</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vas a {roleToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} el rol &quot;{roleToToggle?.name}&quot;. Los usuarios con este rol podrían perder el acceso.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmToggleStatus}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
