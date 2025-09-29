
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registerAction } from '@/lib/actions/auth';

/**
 * @fileoverview Página de registro de nuevos usuarios.
 * Permite a los visitantes crear una cuenta. Si un usuario ya tiene una sesión
 * activa, es redirigido a la página de inicio.
 */

// Array de códigos de país para el selector de teléfono.
const countryCodes = [
    { code: '+213', name: 'Argelia', flag: '🇩🇿' },
    { code: '+54', name: 'Argentina', flag: '🇦🇷' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+880', name: 'Bangladés', flag: '🇧🇩' },
    { code: '+973', name: 'Baréin', flag: '🇧🇭' },
    { code: '+32', name: 'Bélgica', flag: '🇧🇪' },
    { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
    { code: '+55', name: 'Brasil', flag: '🇧🇷' },
    { code: '+237', name: 'Camerún', flag: '🇨🇲' },
    { code: '+1', name: 'Canadá', flag: '🇨🇦' },
    { code: '+57', name: 'Colombia', flag: '🇨🇴' },
    { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
    { code: '+225', name: 'Costa de Marfil', flag: '🇨🇮' },
    { code: '+53', name: 'Cuba', flag: '🇨🇺' },
    { code: '+56', name: 'Chile', flag: '🇨🇱' },
    { code: '+86', name: 'China', flag: '🇨🇳' },
    { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
    { code: '+20', name: 'Egipto', flag: '🇪🇬' },
    { code: '+971', name: 'Emiratos Árabes Unidos', flag: '🇦🇪' },
    { code: '+34', name: 'España', flag: '🇪🇸' },
    { code: '+63', name: 'Filipinas', flag: '🇵🇭' },
    { code: '+679', name: 'Fiyi', flag: '🇫🇯' },
    { code: '+33', name: 'Francia', flag: '🇫🇷' },
    { code: '+233', name: 'Ghana', flag: '🇬🇭' },
    { code: '+30', name: 'Grecia', flag: '🇬🇷' },
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
    { code: '+98', name: 'Irán', flag: '🇮🇷' },
    { code: '+964', name: 'Irak', flag: '🇮🇶' },
    { code: '+972', name: 'Israel', flag: '🇮🇱' },
    { code: '+39', name: 'Italia', flag: '🇮🇹' },
    { code: '+81', name: 'Japón', flag: '🇯🇵' },
    { code: '+962', name: 'Jordania', flag: '🇯🇴' },
    { code: '+254', name: 'Kenia', flag: '🇰🇪' },
    { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
    { code: '+961', name: 'Líbano', flag: '🇱🇧' },
    { code: '+218', name: 'Libia', flag: '🇱🇾' },
    { code: '+60', name: 'Malasia', flag: '🇲🇾' },
    { code: '+212', name: 'Marruecos', flag: '🇲🇦' },
    { code: '+52', name: 'México', flag: '🇲🇽' },
    { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
    { code: '+47', name: 'Noruega', flag: '🇳🇴' },
    { code: '+64', name: 'Nueva Zelanda', flag: '🇳🇿' },
    { code: '+968', name: 'Omán', flag: '🇴🇲' },
    { code: '+92', name: 'Pakistán', flag: '🇵🇰' },
    { code: '+507', name: 'Panamá', flag: '🇵🇦' },
    { code: '+675', name: 'Papúa Nueva Guinea', flag: '🇵🇬' },
    { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
    { code: '+51', name: 'Perú', flag: '🇵🇪' },
    { code: '+48', name: 'Polonia', flag: '🇵🇱' },
    { code: '+351', name: 'Portugal', flag: '🇵🇹' },
    { code: '+974', name: 'Catar', flag: '🇶🇦' },
    { code: '+44', name: 'Reino Unido', flag: '🇬🇧' },
    { code: '+40', name: 'Rumania', flag: '🇷🇴' },
    { code: '+7', name: 'Rusia', flag: '🇷🇺' },
    { code: '+966', name: 'Arabia Saudita', flag: '🇸🇦' },
    { code: '+221', name: 'Senegal', flag: '🇸🇳' },
    { code: '+65', name: 'Singapur', flag: '🇸🇬' },
    { code: '+82', name: 'Corea del Sur', flag: '🇰🇷' },
    { code: '+46', name: 'Suecia', flag: '🇸🇪' },
    { code: '+41', name: 'Suiza', flag: '🇨🇭' },
    { code: '+249', name: 'Sudán', flag: '🇸🇩' },
    { code: '+27', name: 'Sudáfrica', flag: '🇿🇦' },
    { code: '+963', name: 'Siria', flag: '🇸🇾' },
    { code: '+66', name: 'Tailandia', flag: '🇹🇭' },
    { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
    { code: '+216', name: 'Túnez', flag: '🇹🇳' },
    { code: '+90', name: 'Turquía', flag: '🇹🇷' },
    { code: '+993', name: 'Turkmenistán', flag: '🇹🇲' },
    { code: '+380', name: 'Ucrania', flag: '🇺🇦' },
    { code: '+256', name: 'Uganda', flag: '🇺🇬' },
    { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
    { code: '+1', name: 'Estados Unidos', flag: '🇺🇸' },
    { code: '+998', name: 'Uzbekistán', flag: '🇺🇿' },
    { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
    { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
    { code: '+967', name: 'Yemen', flag: '🇾🇪' }
  ];


// Esquema de validación para el formulario de registro.
const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  identification: z.string().min(5, 'La identificación debe tener al menos 5 caracteres.'),
  countryCode: z.string(),
  phoneNumber: z.string().min(7, 'El número de teléfono es muy corto.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Componente principal de la página de registro.
 * 
 * @returns {JSX.Element} El formulario de registro o un mensaje de carga/redirección.
 */
export default function RegisterPage() {
  // Hooks para la gestión de autenticación, enrutamiento, notificaciones y estado.
  const { user, register, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Hook de efecto para redirigir si el usuario ya está logueado.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  // Formulario de registro con react-hook-form y Zod.
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', identification: '', countryCode: '+593', phoneNumber: '', password: '', confirmPassword: '' },
  });

  /**
   * Maneja el envío del formulario de registro.
   * @param {RegisterFormValues} values - Los valores del formulario.
   */
  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
        const result = await register({
            name: values.name,
            email: values.email,
            password: values.password,
            identification: values.identification,
            phone: {
                countryCode: values.countryCode,
                number: values.phoneNumber,
            }
        });

        if (result.success) {
        setIsSubmitted(true);
        toast({
            title: '¡Casi listo!',
            description: 'Hemos enviado un enlace de verificación a tu correo. Por favor, revisa tu bandeja de entrada para activar tu cuenta.',
        });
        } else {
        toast({
            variant: 'destructive',
            title: 'Error de Registro',
            description: result.message || 'Este correo electrónico ya está en uso. Por favor, intenta con otro.',
        });
        }
    } catch(e) {
        toast({
            variant: 'destructive',
            title: 'Error inesperado',
            description: 'Ha ocurrido un error durante el registro.',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  // Muestra un estado de carga mientras se verifica la sesión.
  if (authLoading || user) {
    return <div className="flex h-dvh items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100dvh-200px)] px-4 sm:px-6 lg:px-8 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{isSubmitted ? 'Revisa tu Correo' : 'Crear una Cuenta'}</CardTitle>
          <CardDescription>
            {isSubmitted 
                ? 'Te hemos enviado un enlace de verificación. Por favor, haz clic en él para activar tu cuenta y poder iniciar sesión.'
                : 'Introduce tus datos para registrarte.'
            }
            </CardDescription>
        </CardHeader>
        {!isSubmitted && (
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
                    name="identification"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Identificación (Cédula/DNI)</FormLabel>
                        <FormControl>
                        <Input placeholder="Tu número de identificación" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormItem>
                  <FormLabel>Número de Teléfono</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem className="w-1/3">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue/></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                           <FormControl>
                            <Input type="tel" placeholder="987654321" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </FormItem>

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contraseña</FormLabel>
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
                        <FormLabel>Confirmar Contraseña</FormLabel>
                        <FormControl>
                        <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Cuenta
                </Button>
                </form>
            </Form>
            </CardContent>
        )}
        <CardFooter className="flex flex-col items-center gap-2 text-sm">
          <p className="text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" passHref>
               <span className="font-semibold text-primary hover:underline underline-offset-4">Inicia sesión</span>
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
