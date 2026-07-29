import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-4 px-4 text-center">
        <p className="text-muted-foreground/20 text-8xl font-bold">404</p>
        <h1 className="text-2xl font-bold text-foreground">Página no encontrada</h1>
        <p className="text-sm text-muted-foreground">La ruta que buscas no existe.</p>
        <Link to="/" className="inline-block text-sm text-foreground underline hover:no-underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
