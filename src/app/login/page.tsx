
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { loginAction } from '@/lib/actions/auth';

/**
 * @fileoverview Página de inicio de sesión de usuario.
 * Permite a los usuarios existentes acceder a su cuenta. Si un usuario
 * ya tiene una sesión activa, es redirigido a la página de inicio.
 */

// Esquema de validación para el formulario de inicio de sesión.
const loginSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Componente principal de la página de inicio de sesión.
 * 
 * @returns {JSX.Element} El formulario de inicio de sesión o un mensaje de carga/redirección.
 */
export default function LoginPage() {
  // Hooks para la gestión de autenticación, enrutamiento, notificaciones y estado.
  const { user, login, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/'; // Redirige a la página principal por defecto tras login exitoso

  // Hook de efecto para redirigir si el usuario ya está logueado.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(from);
    }
  }, [user, authLoading, router, from]);

  // Formulario de login con react-hook-form y Zod.
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  /**
   * Maneja el envío del formulario de inicio de sesión.
   * @param {LoginFormValues} values - Los valores del formulario.
   */
  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
        const result = await login(values);
        if (result.success) {
            router.replace(from);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error de inicio de sesión',
                description: result.message || 'El correo electrónico o la contraseña son incorrectos.',
            });
        }
    } catch(e) {
         toast({
            variant: 'destructive',
            title: 'Error inesperado',
            description: 'Ha ocurrido un error al intentar iniciar sesión.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  // Muestra un estado de carga mientras se verifica la sesión.
  if (authLoading || user) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Introduce tus credenciales para acceder a tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                     <div className="flex items-center justify-between">
                        <FormLabel>Contraseña</FormLabel>
                        <Link href="/forgot-password" passHref>
                           <span className="text-sm font-medium text-primary hover:underline underline-offset-4">
                            ¿Olvidaste tu contraseña?
                           </span>
                        </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Sesión
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 text-sm">
          <p className="text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" passHref>
              <span className="font-semibold text-primary hover:underline underline-offset-4">Regístrate</span>
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
