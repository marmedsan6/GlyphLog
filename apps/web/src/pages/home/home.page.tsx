import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ThemeToggle } from '@/components/shared/theme-toggle'

// Página de inicio pública.
// Si el usuario ya está autenticado, redirige directamente a /collection.
export function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/collection', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <div className="max-w-md space-y-6 px-4 text-center">
        <h1 className="text-5xl font-bold text-foreground">GlyphLog</h1>
        <p className="text-lg text-muted-foreground">
          Registra, organiza y sigue tu colección de anime, manga y videojuegos.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link
            to="/login"
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="rounded-md border border-border px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  )
}
