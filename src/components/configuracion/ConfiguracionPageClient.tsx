'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ConfiguracionPageClient() {
  const [mounted, setMounted] = useState(false);

  // This effect ensures the component only renders on the client,
  // preventing hydration errors.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render nothing on the server and during initial client render
    // to prevent hydration mismatch. A skeleton could also be used here.
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>Administra la configuración de tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-switch" className="flex flex-col space-y-1">
                <span>Notificaciones por correo</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Recibe correos sobre tus pedidos y actualizaciones de la tienda.
                </span>
              </Label>
              <Switch id="notifications-switch" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
            <Button asChild variant="outline">
                <Link href="/perfil">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Perfil
                </Link>
            </Button>
        </div>
        
      </div>
    </div>
  );
}
