
'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPasswordAction } from '@/lib/actions/auth';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setError("Token no válido o expirado.");
      return;
    }
    setIsLoading(true);
    const result = await resetPasswordAction(token, values.password);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      toast({
        title: 'Contraseña Restablecida',
        description: 'Tu contraseña ha sido actualizada exitosamente.',
      });
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setError(result.message || 'El enlace de restablecimiento no es válido o ha expirado.');
    }
  };
  
  if (isSuccess) {
    return (
        <CardContent>
            <div className="text-center">
                <p>Tu contraseña ha sido restablecida. Serás redirigido a la página de inicio de sesión.</p>
                <Button asChild className="mt-4">
                    <Link href="/login">Ir a Iniciar Sesión</Link>
                </Button>
            </div>
        </CardContent>
    )
  }

  if (error) {
     return (
        <CardContent>
            <div className="text-center text-destructive">
                <p>{error}</p>
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
                </Button>
            </div>
        </CardContent>
    )
  }
  
  if (!token) {
     return (
        <CardContent>
            <div className="text-center text-destructive">
                <p>Falta el token de restablecimiento. Por favor, utiliza el enlace de tu correo.</p>
            </div>
        </CardContent>
    )
  }

  return (
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restablecer Contraseña
            </Button>
          </form>
        </Form>
      </CardContent>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100dvh-200px)] px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Crear Nueva Contraseña</CardTitle>
          <CardDescription>
            Introduce tu nueva contraseña a continuación.
          </CardDescription>
        </CardHeader>
        <Suspense fallback={<div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}>
            <ResetPasswordForm />
        </Suspense>
        <CardFooter className="flex justify-center text-sm">
          <Link href="/login" passHref>
             <span className="font-semibold text-primary hover:underline underline-offset-4">Volver a Iniciar Sesión</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
