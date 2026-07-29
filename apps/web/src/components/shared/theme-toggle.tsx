import { useThemeStore } from '@/stores/theme.store'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'reicon-react'

/**
 * Botón de cambio de tema con un solo clic (toggle).
 *
 * Alterna directamente entre los temas Claro y Oscuro de manera inmediata.
 */
export function ThemeToggle() {
  const { toggleTheme } = useThemeStore()

  function handleToggle(): void {
    if (!document.startViewTransition) {
      toggleTheme()
      return
    }
    document.startViewTransition(toggleTheme)
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle} aria-label="Cambiar tema">
      <Sun size={20} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon
        size={20}
        className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
      />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
}
