
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getNosotrosPageConfig } from '@/lib/data/nosotros';
import { Icon, IconName } from '@/lib/icons';

export default async function NosotrosPage() {
  const config = await getNosotrosPageConfig();
  const { main, pillars } = config;

  return (
    <div className="bg-background">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">{main.title}</h1>
                    <p className="mt-6 text-lg text-muted-foreground">
                       {main.p1}
                    </p>
                    <p className="mt-4 text-muted-foreground">
                        {main.p2}
                    </p>
                    <Button asChild className="mt-8" size="lg">
                        <Link href="/tienda">Explora la Colección</Link>
                    </Button>
                </div>
                <div className="aspect-video rounded-lg overflow-hidden shadow-xl">
                    {main.imageUrl && (
                        <Image
                            src={main.imageUrl}
                            alt="Equipo de HackTrickStore"
                            width={600}
                            height={400}
                            className="object-cover w-full h-full"
                        />
                    )}
                </div>
            </div>
        </section>

        <section className="bg-muted py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="font-headline text-3xl md:text-4xl font-bold">{pillars.title}</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        {pillars.description}
                    </p>
                </div>
                <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {pillars.items.map((value) => (
                        <div key={value.title} className="text-center p-6">
                            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                                <Icon name={value.icon as IconName} className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">{value.title}</h3>
                            <p className="mt-2 text-muted-foreground">{value.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    </div>
  );
}
