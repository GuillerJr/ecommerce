
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmailAction } from '@/lib/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

function VerificationStatus() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu cuenta...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no encontrado.');
      return;
    }

    const verify = async () => {
      const result = await verifyEmailAction(token);
      if (result.success) {
        setStatus('success');
        setMessage('¡Tu cuenta ha sido verificada exitosamente! Ahora puedes iniciar sesión.');
        setTimeout(() => router.push('/login'), 5000);
      } else {
        setStatus('error');
        setMessage(result.message || 'Ocurrió un error al verificar tu cuenta.');
      }
    };

    verify();
  }, [token, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {status === 'loading' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
        {status === 'success' && <CheckCircle className="mx-auto h-12 w-12 text-green-500" />}
        {status === 'error' && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
        <CardTitle className="text-2xl mt-4">
            {status === 'loading' && 'Verificando...'}
            {status === 'success' && '¡Verificación Exitosa!'}
            {status === 'error' && 'Error de Verificación'}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {status === 'success' && (
          <Button asChild>
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        )}
        {status === 'error' && (
           <Button asChild variant="secondary">
            <Link href="/register">Intentar Registrarse de Nuevo</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


export default function VerifyEmailPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
      <Suspense fallback={<Card className="w-full max-w-md p-8 text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin" /></Card>}>
        <VerificationStatus />
      </Suspense>
    </div>
  );
}
