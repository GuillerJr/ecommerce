

'use client';

import { useState, useEffect } from 'react';
import { Facebook, Twitter, Instagram, Linkedin, MapPin, Mail, Phone } from 'lucide-react';
import type { StoreConfig } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { FaWhatsapp, FaThreads } from 'react-icons/fa6';


function FooterClientContent({ storeConfig }: { storeConfig: StoreConfig }) {
  const [currentYear, setCurrentYear] = useState<number | string>('');

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  return (
      <div className="mt-8 pt-8 border-t text-center text-sm space-y-1">
        <p>© {currentYear} {storeConfig.name}. Todos los derechos reservados.</p>
        {storeConfig.socials.linkedin && <p className="text-muted-foreground text-xs">Sistema creado por <a href={storeConfig.socials.linkedin} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-primary hover:underline">HackTrick's</a>.</p>}
      </div>
  )
}


export default function Footer({ storeConfig }: { storeConfig: StoreConfig }) {
  const { name, description, socials, address, contactEmail, contactPhone, logoUrl, logoUrlDark } = storeConfig;
  
  const BrandLogo = () => {
    return (
        <div className="flex items-center gap-2">
            {logoUrl && (
                <Image src={logoUrl} alt={`${name} logo`} width={32} height={32} className="h-8 w-auto object-contain dark:hidden" />
            )}
            {logoUrlDark && (
                <Image src={logoUrlDark} alt={`${name} logo`} width={32} height={32} className="h-8 w-auto object-contain hidden dark:block" />
            )}
            <h3 className="font-bold font-headline text-lg text-foreground">{name}</h3>
        </div>
    );
  };

  return (
    <footer className="bg-white dark:bg-black text-black dark:text-white border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center">
                <BrandLogo />
            </Link>
            <p className="text-sm max-w-xs">{description}</p>
            <div className="flex space-x-4">
              {socials.facebook && <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Facebook className="h-5 w-5" /></a>}
              {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Twitter className="h-5 w-5" /></a>}
              {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Instagram className="h-5 w-5" /></a>}
              {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Linkedin className="h-5 w-5" /></a>}
              {socials.whatsapp && <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><FaWhatsapp className="h-5 w-5" /></a>}
              {socials.threads && <a href={socials.threads} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><FaThreads className="h-5 w-5" /></a>}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-current">Tienda</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/tienda" className="hover:text-primary">Todos los Productos</Link></li>
              <li><Link href="/tienda?category=Uniformes%20de%20Equipo" className="hover:text-primary">Uniformes</Link></li>
              <li><Link href="/tienda?category=Ropa%20de%20Entrenamiento" className="hover:text-primary">Entrenamiento</Link></li>
              <li><Link href="/tienda?category=Accesorios%20Deportivos" className="hover:text-primary">Accesorios</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-current">Información</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/nosotros" className="hover:text-primary">Sobre nosotros</Link></li>
              <li><Link href="/contacto" className="hover:text-primary">Contacto</Link></li>
              <li><Link href="/sorteos" className="hover:text-primary">Sorteos</Link></li>
              <li><Link href="/torneos/eliminatoria" className="hover:text-primary">Torneos (Eliminatoria)</Link></li>
              <li><Link href="/torneos/liga" className="hover:text-primary">Torneos (Liga)</Link></li>
              <li><Link href="/torneos/grupos" className="hover:text-primary">Torneos (Grupos)</Link></li>
              <li><Link href="/terminos" className="hover:text-primary">Términos de Servicio</Link></li>
              <li><Link href="/privacidad" className="hover:text-primary">Política de Privacidad</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
             <h4 className="font-semibold text-current">Contacto</h4>
             <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 mt-0.5 shrink-0" />
                    <span>{address.street},<br/>{address.city}, {address.postalCode},<br/>{address.country}</span>
                </li>
                <li className="flex items-center gap-2">
                    <Mail className="h-5 w-5 shrink-0" />
                    <a href={`mailto:${contactEmail}`} className="hover:text-primary">{contactEmail}</a>
                </li>
                 <li className="flex items-center gap-2">
                    <Phone className="h-5 w-5 shrink-0" />
                    <a href={`tel:${contactPhone}`} className="hover:text-primary">{contactPhone}</a>
                </li>
             </ul>
          </div>
        </div>
        <FooterClientContent storeConfig={storeConfig} />
      </div>
    </footer>
  );
}
