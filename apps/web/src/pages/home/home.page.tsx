import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
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
      <div className="text-center space-y-6 max-w-md px-4">
        <h1 className="text-5xl font-bold text-foreground">GlyphLog</h1>
        <p className="text-lg text-muted-foreground">
          Registra, organiza y sigue tu colección de anime, manga y videojuegos.
        </p>
        <div className="flex gap-4 justify-center pt-2">
          <Link
            to="/login"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="px-6 py-2 border border-border text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  )
}
