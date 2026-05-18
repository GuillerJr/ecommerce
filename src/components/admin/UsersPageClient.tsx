
'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Pencil, Users, Archive, ArchiveRestore, FileDown, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { User, StoreConfig, Role } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { updateUserAction, getStoreConfigAction, getRolesAction, addUserFromAdminAction } from "@/lib/actions";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

const editUserSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  email: z.string().email("Correo electrónico inválido."),
  roleId: z.string().uuid("El rol es requerido."),
  status: z.enum(['Activo', 'Inactivo']),
});

const createUserSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  email: z.string().email("Correo electrónico inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  roleId: z.string().uuid("El rol es requerido."),
  status: z.enum(['Activo', 'Inactivo']),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;
type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface UsersPageClientProps {
    initialUsers: User[];
}

export default function UsersPageClient({ initialUsers }: UsersPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToToggle, setUserToToggle] = useState<User | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("active");
    const [currentPage, setCurrentPage] = useState(1);
    const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

    useEffect(() => { 
        setAllUsers(initialUsers); 
        getRolesAction().then(res => {
            if (res.success && res.roles) setRoles(res.roles);
        });
    }, [initialUsers]);
    
    useEffect(() => {
        getStoreConfigAction().then(result => {
            if(result.success) setStoreConfig(result.config);
        });
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter, activeTab]);

    const filteredUsers = useMemo(() => {
        return allUsers.filter(user => {
            const searchMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const roleMatch = roleFilter === 'all' || user.role === roleFilter;
            const statusMatch = (activeTab === 'active' ? user.status === 'Activo' : user.status === 'Inactivo');
            return searchMatch && roleMatch && statusMatch;
        });
    }, [allUsers, searchTerm, roleFilter, activeTab]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = useMemo(() => filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ), [filteredUsers, currentPage]);


    const editForm = useForm<EditUserFormValues>({
      resolver: zodResolver(editUserSchema),
      defaultValues: { name: "", email: "", roleId: "", status: "Activo" },
    });
    
    const createForm = useForm<CreateUserFormValues>({
      resolver: zodResolver(createUserSchema),
      defaultValues: { name: "", email: "", password: "", roleId: "", status: "Activo" },
    });

    useEffect(() => {
      if (editingUser) {
          editForm.reset({ ...editingUser, roleId: editingUser.roleId || "" });
      } else {
          editForm.reset({ name: "", email: "", roleId: "", status: "Activo" });
      }
    }, [editingUser, editForm]);

    const handleCreate = () => {
        createForm.reset({ name: "", email: "", password: "", roleId: "", status: "Activo" });
        setIsCreateDialogOpen(true);
    };

    const handleEdit = (user: User) => {
      setEditingUser(user);
      setIsEditDialogOpen(true);
    };

    const handleToggleStatus = (user: User) => {
      if (user.id === currentUser?.id) {
        toast({ title: "Acción no permitida", description: "No puedes desactivar tu propia cuenta.", variant: "destructive" });
        return;
      }
      setUserToToggle(user);
      setIsConfirmOpen(true);
    };

    const confirmToggleStatus = async () => {
      if (!userToToggle || !currentUser) return;
      
      const newStatus = userToToggle.status === 'Activo' ? 'Inactivo' : 'Activo';
      const result = await updateUserAction({ ...userToToggle, status: newStatus }, currentUser.id);
      if(result.success) {
        toast({ title: "Estado del usuario actualizado" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }

      setUserToToggle(null);
      setIsConfirmOpen(false);
    };

    const onEditSubmit = async (data: EditUserFormValues) => {
      if (editingUser && currentUser) {
          const role = roles.find(r => r.id === data.roleId);
          if (!role) {
              toast({title: "Error", description: "Rol no válido seleccionado.", variant: "destructive"});
              return;
          }
        await updateUserAction({ ...editingUser, ...data, role: role.name }, currentUser.id);
        toast({ title: "Usuario actualizado" });
      }
      router.refresh();
      setIsEditDialogOpen(false);
      setEditingUser(null);
    };
    
    const onCreateSubmit = async (data: CreateUserFormValues) => {
        if (!currentUser) return;

        const result = await addUserFromAdminAction(data, currentUser.id);
        if (result.success) {
            toast({ title: "Usuario creado exitosamente" });
            router.refresh();
            setIsCreateDialogOpen(false);
        } else {
            toast({ title: "Error al crear usuario", description: result.message, variant: "destructive" });
        }
    };

    const handleExportPDF = () => {
        if (!storeConfig) return;
        const doc = new jsPDF();
        const tableData = filteredUsers.map(u => [
            u.name,
            u.email,
            u.role,
            u.status,
        ]);
        const tableHeaders = ["Nombre", "Email", "Rol", "Estado"];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(storeConfig.name, 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text("Reporte de Usuarios", 14, 35);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        const roleText = roleFilter === 'all' ? 'Todos' : roleFilter;
        const tabText = activeTab === 'active' ? 'Activos' : 'Inactivos';
        const filtersApplied = `Rol: ${roleText}, Pestaña: ${tabText}, Búsqueda: "${searchTerm || 'Ninguna'}"`;

        doc.text(`Filtros Aplicados: ${filtersApplied}`, 14, 40);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 44);

        autoTable(doc, {
            startY: 50,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 22, 22] },
            styles: { font: 'helvetica', fontSize: 8 },
        });

        doc.save(`reporte_usuarios_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    
    const renderTable = (usersToRender: User[]) => (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersToRender.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                                    {user.role}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.status === 'Activo' ? 'default' : 'secondary'}>
                                    {user.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                                          <Pencil className="mr-2 h-4 w-4"/> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                          {user.status === 'Activo' ? 
                                              <><Archive className="mr-2 h-4 w-4"/> Desactivar</> : 
                                              <><ArchiveRestore className="mr-2 h-4 w-4"/> Activar</>
                                          }
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-6">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{paginatedUsers.length}</strong> de <strong>{filteredUsers.length}</strong> usuarios.
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
        </>
    );

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-secondary p-3 rounded-full border">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Usuarios</h1>
                        <p className="text-muted-foreground">Gestiona los usuarios de la plataforma.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportPDF} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Exportar a PDF</Button>
                    <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4"/>Crear Usuario</Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Input 
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="sm:w-[180px]">
                                <SelectValue placeholder="Filtrar por rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los roles</SelectItem>
                                {roles.map(role => (
                                    <SelectItem key={role.id} value={role.name} className="capitalize">{role.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="active">Activos</TabsTrigger>
                            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            {renderTable(paginatedUsers)}
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-4">
                            {renderTable(paginatedUsers)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Editar Usuario</DialogTitle>
                  <DialogDescription>
                    Modifica los detalles del usuario.
                  </DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                    <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="roleId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                              {roles.map(role => (
                                  <SelectItem key={role.id} value={role.id} className="capitalize">{role.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                              <SelectItem value="Activo">Activo</SelectItem>
                              <SelectItem value="Inactivo">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">Guardar</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Create User Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Rellena los datos para el nuevo usuario. La cuenta se creará como 'Activa'.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-4">
                    <FormField control={createForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={createForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={createForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={createForm.control} name="roleId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un rol..."/></SelectTrigger></FormControl>
                          <SelectContent>
                              {roles.map(role => (
                                  <SelectItem key={role.id} value={role.id} className="capitalize">{role.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">Crear Usuario</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>


            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescriptionComponent>
                    Vas a {userToToggle?.status === 'Activo' ? 'desactivar' : 'activar'} al usuario &quot;{userToToggle?.name}&quot;.
                  </AlertDialogDescriptionComponent>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmToggleStatus}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
