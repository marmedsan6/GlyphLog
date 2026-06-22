import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { ThemeToggle } from '@/components/shared/theme-toggle'

// Layout principal para las páginas protegidas.
// Incluye header con navegación y área de contenido principal.
export function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout(): void {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link
            to="/collection"
            className="text-xl font-bold text-foreground hover:opacity-80 transition-opacity"
          >
            GlyphLog
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/collection"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Colección
            </Link>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
