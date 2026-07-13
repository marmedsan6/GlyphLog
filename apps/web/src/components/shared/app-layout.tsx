import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { SearchBar } from '@/components/shared/search-bar'

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
        <div className="container mx-auto flex items-center justify-between px-4 py-3 gap-2">
          <Link
            to="/collection"
            className="text-xl font-bold text-foreground hover:opacity-80 transition-opacity shrink-0"
          >
            GlyphLog
          </Link>
          <div className="flex-1 max-w-xs sm:max-w-md mx-2 sm:mx-6">
            <SearchBar />
          </div>
          <nav className="flex items-center gap-4 sm:gap-6 shrink-0">
            <Link
              to="/collection"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
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
