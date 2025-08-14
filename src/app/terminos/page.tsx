'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TerminosPage() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    setLastUpdated(new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Términos de Servicio</CardTitle>
            <CardDescription>Última actualización: {lastUpdated || '...'}</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-6">
            <p className="text-base">
              Bienvenido a HackTrickStore. Estos términos y condiciones describen las reglas y regulaciones para el uso del sitio web de HackTrickStore, ubicado en esta misma URL. Al acceder a este sitio web, asumimos que aceptas estos términos y condiciones. No continúes usando HackTrickStore si no estás de acuerdo con todos los términos y condiciones establecidos en esta página.
            </p>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">1. Uso del Sitio Web</h3>
              <p>
                La licencia para usar este sitio web es para fines personales y no comerciales. No debes utilizar este sitio para ningún propósito ilegal o prohibido por estos términos. Se prohíbe el uso de cualquier dispositivo o software que interfiera con el funcionamiento adecuado del sitio.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">2. Propiedad Intelectual</h3>
              <p>
                El Servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de HackTrickStore y sus licenciantes. El Servicio está protegido por derechos de autor, marcas registradas y otras leyes tanto de nuestro país como de países extranjeros. Nuestras marcas comerciales no pueden ser utilizadas en conexión con ningún producto o servicio sin el consentimiento previo por escrito de HackTrickStore.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">3. Cuentas de Usuario</h3>
              <p>
                Cuando creas una cuenta con nosotros, debes proporcionarnos información precisa, completa y actual en todo momento. El incumplimiento de esto constituye una violación de los Términos, lo que puede resultar en la terminación inmediata de tu cuenta en nuestro Servicio. Eres responsable de salvaguardar la contraseña que utilizas para acceder al Servicio y de cualquier actividad o acción bajo tu contraseña.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">4. Productos y Precios</h3>
              <p>
                Nos esforzamos por mostrar con la mayor precisión posible los colores y las imágenes de nuestros productos. No podemos garantizar que la visualización de cualquier color en el monitor de tu computadora sea precisa. Nos reservamos el derecho de limitar las cantidades de cualquier producto o servicio que ofrecemos. Todos los precios de los productos están sujetos a cambios sin previo aviso.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">5. Terminación</h3>
              <p>
                Podemos terminar o suspender tu cuenta inmediatamente, sin previo aviso ni responsabilidad, por cualquier motivo, incluyendo, sin limitación, si incumples los Términos. Tras la terminación, tu derecho a utilizar el Servicio cesará inmediatamente.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">6. Limitación de Responsabilidad</h3>
              <p>
                En ningún caso HackTrickStore, ni sus directores, empleados, socios, agentes, proveedores o afiliados, serán responsables de daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo, sin limitación, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles, que resulten de tu acceso o uso o incapacidad para acceder o usar el Servicio.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">7. Ley Aplicable</h3>
              <p>
                Estos Términos se regirán e interpretarán de acuerdo con las leyes de nuestro país, sin tener en cuenta sus disposiciones sobre conflictos de leyes.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">8. Cambios en los Términos</h3>
              <p>
                Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso de al menos 30 días antes de que los nuevos términos entren en vigencia. Lo que constituye un cambio material se determinará a nuestra sola discreción.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">9. Contacto</h3>
              <p>
                Si tienes alguna pregunta sobre estos Términos, por favor <a href="/contacto" className="text-primary hover:underline">contáctanos</a>.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
