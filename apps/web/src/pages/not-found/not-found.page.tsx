import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <p className="text-8xl font-bold text-muted-foreground/20">404</p>
        <h1 className="text-2xl font-bold text-foreground">Página no encontrada</h1>
        <p className="text-muted-foreground text-sm">
          La ruta que buscas no existe.
        </p>
        <Link
          to="/"
          className="inline-block text-sm text-foreground underline hover:no-underline"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
