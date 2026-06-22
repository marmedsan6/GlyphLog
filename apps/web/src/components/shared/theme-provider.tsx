import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '@/stores/theme.store'

/**
 * Sincroniza el tema de Zustand con el DOM.
 *
 * Cada vez que `theme` cambia en el store, añade o quita la clase `dark`
 * de <html>. Esto permite que Tailwind (configurado con darkMode: ['class'])
 * aplique las variables CSS correctas.
 *
 * El valor inicial ya fue aplicado por el script inline de FOUC en index.html,
 * pero este efecto asegura la sincronización cuando React hidrata.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
