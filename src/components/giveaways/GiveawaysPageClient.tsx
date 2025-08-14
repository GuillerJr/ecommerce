

'use client';

import { useState, useEffect } from 'react';
import { getGiveawaysAction, participateInGiveawayAction } from '@/lib/actions';
import type { Giveaway, Product, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { Gift, Ticket, User as UserIcon, Check, Loader2, Users, ShoppingBag } from 'lucide-react';

interface GiveawaysPageClientProps {
    initialGiveaways: Giveaway[];
    allProducts: Product[];
    allUsers: User[];
}

export default function GiveawaysPageClient({ initialGiveaways, allProducts, allUsers }: GiveawaysPageClientProps) {
  const [giveaways, setGiveaways] = useState<Giveaway[]>(initialGiveaways);
  const [participatingId, setParticipatingId] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setGiveaways(initialGiveaways);
  }, [initialGiveaways]);

  const getProductById = (id: string) => allProducts.find(p => p.id === id);
  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  const handleParticipate = async (giveawayId: string) => {
    if (!user) {
      toast({ title: 'Debes iniciar sesión para participar', variant: 'destructive' });
      return;
    }
    setParticipatingId(giveawayId);
    const result = await participateInGiveawayAction(giveawayId, user.id);
    if (result.success) {
      toast({ title: '¡Mucha suerte!', description: 'Has entrado al sorteo.' });
      const giveawaysRes = await getGiveawaysAction();
      if (giveawaysRes.success) setGiveaways(giveawaysRes.giveaways || []);
    } else {
      toast({ title: 'Error al participar', description: result.message, variant: 'destructive' });
    }
    setParticipatingId(null);
  };
  
  const activeGiveaways = giveaways.filter(g => ['Activo', 'Programado'].includes(g.status));
  const finishedGiveaways = giveaways.filter(g => g.status === 'Finalizado');

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Sorteos Exclusivos</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Participa en nuestros sorteos y gana increíbles premios. ¡Mucha suerte!
        </p>
      </div>

      <section>
        <h2 className="font-headline text-3xl font-bold mb-6">Activos Ahora</h2>
        {activeGiveaways.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeGiveaways.map(giveaway => {
              const prizeProduct = getProductById(giveaway.productPrizeIds[0]);
              const alreadyParticipating = user ? giveaway.participants.includes(user.id) : false;

              return (
                <Card key={giveaway.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{giveaway.name}</CardTitle>
                    <CardDescription>{giveaway.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Premio:</h4>
                         {prizeProduct && (
                           <div className="flex items-start gap-4 rounded-lg border p-3 bg-muted/50">
                                <Image src={prizeProduct.image} alt={prizeProduct.name} width={64} height={64} className="rounded-md border object-cover aspect-square" />
                                <div className="flex-1">
                                    <p className="font-medium text-sm leading-tight">{prizeProduct.name}</p>
                                    <p className="text-xs text-muted-foreground">Valorado en ${prizeProduct.price.toFixed(2)}</p>
                                </div>
                           </div>
                        )}
                      </div>
                       <div>
                          <h4 className="text-sm font-semibold mb-2">Requisito de Entrada:</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {giveaway.entryType === 'open' 
                                  ? <><Users className="h-4 w-4 text-primary" /><span>Abierto a todos los usuarios</span></>
                                  : <><ShoppingBag className="h-4 w-4 text-primary" /><span>Compra mínima de ${giveaway.minPurchaseAmount?.toFixed(2)}</span></>
                              }
                          </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Finaliza:</h4>
                         <p className="text-sm text-muted-foreground">
                            {format(new Date(giveaway.endDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleParticipate(giveaway.id)} 
                      disabled={authLoading || alreadyParticipating || participatingId === giveaway.id || giveaway.status !== 'Activo'}
                    >
                      {giveaway.status === 'Programado' ? 'Próximamente' :
                       participatingId === giveaway.id ? <Loader2 className="animate-spin" /> :
                       alreadyParticipating ? <><Check className="mr-2"/> Ya estás participando</> : 
                       <><Ticket className="mr-2"/> Participar Ahora</>}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <p className="text-lg text-muted-foreground">No hay sorteos activos en este momento. ¡Vuelve pronto!</p>
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="font-headline text-3xl font-bold mb-6">Sorteos Finalizados</h2>
         {finishedGiveaways.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
             {finishedGiveaways.map(giveaway => {
              const prizeProduct = getProductById(giveaway.productPrizeIds[0]);
              const winner = giveaway.winnerId ? getUserById(giveaway.winnerId) : null;
              
              return (
                 <Card key={giveaway.id} className="opacity-70">
                   <CardHeader>
                    <CardTitle>{giveaway.name}</CardTitle>
                    <CardDescription>
                      Finalizado el {format(new Date(giveaway.endDate), 'dd/MM/yyyy')}
                    </CardDescription>
                  </CardHeader>
                   <CardContent className="space-y-4">
                      {winner ? (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Ganador:</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <UserIcon className="h-4 w-4 text-primary" />
                              <span className="font-bold">{winner.name}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">El ganador será anunciado pronto.</p>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Premio:</h4>
                         {prizeProduct && (
                           <div className="flex items-center gap-3">
                                <Image src={prizeProduct.image} alt={prizeProduct.name} width={40} height={40} className="rounded-md border object-cover aspect-square" />
                                <p className="text-sm text-muted-foreground font-medium">{prizeProduct.name}</p>
                           </div>
                        )}
                      </div>
                   </CardContent>
                 </Card>
              );
             })}
          </div>
         ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <p className="text-lg text-muted-foreground">Aún no ha finalizado ningún sorteo.</p>
            </div>
         )}
      </section>

    </div>
  );
}
