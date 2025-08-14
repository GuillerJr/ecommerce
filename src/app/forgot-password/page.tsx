
'use client';

import { useState } from 'react';
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
import { requestPasswordResetAction } from '@/lib/actions/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    await requestPasswordResetAction(values.email);
    setIsLoading(false);
    setIsSubmitted(true);
    
    toast({
      title: 'Solicitud Enviada',
      description: 'Si tu correo está en nuestro sistema, recibirás un enlace para restablecer tu contraseña en breve.',
    });
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
          <CardDescription>
            {isSubmitted
              ? 'Revisa tu bandeja de entrada para continuar.'
              : 'Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.'}
          </CardDescription>
        </CardHeader>
        {!isSubmitted && (
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Enlace
                </Button>
              </form>
            </Form>
          </CardContent>
        )}
        <CardFooter className="flex justify-center text-sm">
          <Link href="/login" passHref>
             <span className="font-semibold text-primary hover:underline underline-offset-4">Volver a Iniciar Sesión</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
