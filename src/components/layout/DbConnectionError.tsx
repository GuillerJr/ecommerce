/**
 * @fileoverview Componente que muestra una página de error específica cuando
 * la aplicación no puede conectarse a la base de datos.
 * Proporciona una retroalimentación clara al desarrollador sobre el problema
 * y posibles soluciones.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseZap } from 'lucide-react';

/**
 * Renderiza una página HTML completa con un mensaje de error de conexión a la BD.
 * Esta página no depende del layout principal para poder mostrarse incluso si
 * la obtención de datos para el layout falla.
 * 
 * @returns {JSX.Element} La página de error de conexión.
 */
export default function DbConnectionError() {
  return (
    <html lang="es">
      <head>
        <title>Error de Conexión</title>
        {/* Estilos en línea para asegurar que se apliquen sin depender de archivos CSS externos */}
        <style>{`
          body {
            font-family: Inter, sans-serif;
            margin: 0;
          }
          .dark {
            --background: 0 0% 3.9%;
            --foreground: 0 0% 98%;
            --card: 0 0% 3.9%;
            --card-foreground: 0 0% 98%;
            --muted: 0 0% 14.9%;
            --secondary: 0 0% 14.9%;
            --destructive: 0 62.8% 30.6%;
            --border: 0 0% 14.9%;
          }
        `}</style>
      </head>
      <body>
        <div className="flex h-dvh w-full items-center justify-center bg-muted p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit">
                <DatabaseZap className="h-8 w-8" />
              </div>
              <CardTitle className="mt-4">Error de Conexión a la Base de Datos</CardTitle>
              <CardDescription>
                La aplicación no pudo conectarse a la base de datos PostgreSQL.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-left bg-secondary/50 p-4 rounded-md text-sm">
                <p className="font-semibold">Posibles Soluciones:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Asegúrate de que tu servidor PostgreSQL esté iniciado y funcionando.</li>
                  <li>Verifica que las credenciales en tu archivo <code>.env</code> sean correctas (host, puerto, usuario, contraseña, nombre de la base de datos).</li>
                  <li>Comprueba que no haya un firewall bloqueando el puerto de la base de datos.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
