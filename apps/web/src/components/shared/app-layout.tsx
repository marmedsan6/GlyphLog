import { Link, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { SearchBar } from '@/components/shared/search-bar'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

// Layout principal para las páginas protegidas.
// Incluye header con navegación, búsqueda, menú de perfil y área de contenido.
export function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { data: profile } = useProfile()

  function handleLogout(): void {
    logout()
    navigate('/login', { replace: true })
  }

  const displayName = profile?.username || profile?.email || 'Usuario'
  const avatarUrl = profile?.avatar_url ?? null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <Link
            to="/collection"
            className="shrink-0 text-xl font-bold text-foreground transition-opacity hover:opacity-80"
          >
            GlyphLog
          </Link>
          <div className="mx-2 max-w-xs flex-1 sm:mx-6 sm:max-w-md">
            <SearchBar />
          </div>
          <nav className="flex shrink-0 items-center gap-4 sm:gap-6">
            <Link
              to="/collection"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Colección
            </Link>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full p-0"
                  aria-label="Menú de perfil"
                >
                  <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} size="sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mi perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
