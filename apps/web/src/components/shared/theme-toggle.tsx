import { useThemeStore } from '@/stores/theme.store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sun, Moon } from 'lucide-react'

/**
 * Botón de cambio de tema con DropdownMenu.
 *
 * Muestra un icono de sol/luna animado que rota al cambiar de tema,
 * y un menú desplegable con las opciones explícitas "Claro" y "Oscuro".
 *
 * ¿Por qué DropdownMenu en lugar de un simple botón toggle?
 * - Más accesible: el usuario ve explícitamente las dos opciones.
 * - Más escalable: si en el futuro se añade "Sistema", el menú lo soporta.
 * - Consistente con el patrón usado en shadcn/ui para selectores de tema.
 */
export function ThemeToggle() {
  const { setTheme } = useThemeStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Oscuro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
