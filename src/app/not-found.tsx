
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchX } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-200px)] items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
            <div className="mx-auto bg-secondary p-4 rounded-full w-fit">
                <SearchX className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4 text-3xl font-bold">404 - Página No Encontrada</CardTitle>
            <CardDescription className="text-lg">
                ¡Vaya! Parece que la página que buscas no existe o ha sido movida.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="mb-6 text-muted-foreground">
                No te preocupes, puedes volver a la página de inicio y continuar tu compra.
            </p>
            <Button asChild size="lg">
                <Link href="/">Ir a la Página de Inicio</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  )
}
