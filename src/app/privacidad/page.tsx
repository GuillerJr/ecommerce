'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PrivacidadPage() {
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
            <CardTitle className="text-3xl font-bold">Política de Privacidad</CardTitle>
            <CardDescription>Última actualización: {lastUpdated || '...'}</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-6">
            <p className="text-base">
              Esta Política de Privacidad describe nuestras políticas y procedimientos sobre la recopilación, uso y divulgación de tu información cuando utilizas el Servicio y te informa sobre tus derechos de privacidad y cómo la ley te protege. Usamos tus datos personales para proporcionar y mejorar el Servicio. Al utilizar el Servicio, aceptas la recopilación y el uso de información de acuerdo con esta Política de Privacidad.
            </p>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">1. Recopilación y Uso de Datos Personales</h3>
              <p>
                Mientras usas nuestro Servicio, podemos pedirte que nos proporciones cierta información de identificación personal que se puede utilizar para contactarte o identificarte. La información de identificación personal puede incluir, entre otros:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Dirección de correo electrónico</li>
                <li>Nombre y apellido</li>
                <li>Número de teléfono</li>
                <li>Dirección, Estado, Provincia, Código postal, Ciudad</li>
                <li>Datos de uso</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">2. Datos de Uso</h3>
              <p>
                Los Datos de Uso se recopilan automáticamente cuando se utiliza el Servicio. Estos pueden incluir la dirección IP de tu dispositivo, tipo y versión del navegador, las páginas que visitas, la hora y fecha de tu visita, y otros datos de diagnóstico.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">3. Uso de tus Datos Personales</h3>
              <p>La Compañía puede utilizar los Datos Personales para los siguientes propósitos:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                  <li><strong>Para proporcionar y mantener nuestro Servicio:</strong> Incluido el seguimiento del uso de nuestro Servicio.</li>
                  <li><strong>Para gestionar tu Cuenta:</strong> Para gestionar tu registro como usuario del Servicio.</li>
                  <li><strong>Para la ejecución de un contrato:</strong> El desarrollo, cumplimiento y realización del contrato de compra de los productos que has comprado.</li>
                  <li><strong>Para contactarte:</strong> A través de correo electrónico, llamadas telefónicas, SMS u otras formas de comunicación electrónica sobre actualizaciones o comunicaciones informativas relacionadas con las funcionalidades, productos o servicios contratados.</li>
                  <li><strong>Para gestionar tus solicitudes:</strong> Para atender y gestionar tus solicitudes hacia nosotros.</li>
              </ul>
            </div>

             <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">4. Divulgación de tus Datos Personales</h3>
                <h4 className="font-semibold text-foreground/90">Transacciones comerciales</h4>
                <p>Si la Compañía está involucrada en una fusión, adquisición o venta de activos, tus Datos Personales pueden ser transferidos.</p>
                <h4 className="font-semibold text-foreground/90 mt-2">Cumplimiento de la ley</h4>
                <p>Bajo ciertas circunstancias, la Compañía puede ser requerida a divulgar tus Datos Personales si así lo exige la ley o en respuesta a solicitudes válidas de autoridades públicas.</p>
             </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">5. Seguridad de tus Datos Personales</h3>
              <p>
                La seguridad de tus Datos Personales es importante para nosotros, pero recuerda que ningún método de transmisión por Internet o método de almacenamiento electrónico es 100% seguro. Si bien nos esforzamos por utilizar medios comercialmente aceptables para proteger tus Datos Personales, no podemos garantizar su seguridad absoluta.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">6. Privacidad de los Niños</h3>
              <p>
                Nuestro Servicio no se dirige a nadie menor de 13 años. No recopilamos conscientemente información de identificación personal de nadie menor de 13 años. Si eres padre o tutor y sabes que tu hijo nos ha proporcionado Datos Personales, por favor contáctanos.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">7. Enlaces a Otros Sitios Web</h3>
              <p>
                Nuestro Servicio puede contener enlaces a otros sitios web que no son operados por nosotros. Si haces clic en un enlace de un tercero, serás dirigido al sitio de ese tercero. Te recomendamos encarecidamente que revises la Política de Privacidad de cada sitio que visites. No tenemos control ni asumimos responsabilidad por el contenido, las políticas de privacidad o las prácticas de sitios o servicios de terceros.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">8. Cambios a esta Política de Privacidad</h3>
              <p>
                Podemos actualizar nuestra Política de Privacidad de vez en cuando. Te notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página. Se te aconseja revisar esta Política de Privacidad periódicamente para cualquier cambio. Los cambios a esta Política de Privacidad son efectivos cuando se publican en esta página.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
