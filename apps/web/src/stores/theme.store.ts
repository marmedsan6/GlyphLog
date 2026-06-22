import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/**
 * Store global del tema (claro/oscuro) con Zustand.
 *
 * ¿Por qué Zustand en lugar de Context?
 * - No requiere envolver la app en un Provider para acceder al estado en cualquier lado.
 * - La persistencia en localStorage se maneja manualmente para tener control sobre
 *   la clave usada (glyphlog-theme) y poder leerla desde el script inline de FOUC.
 * - El script inline en index.html lee localStorage ANTES de que React cargue,
 *   eliminando el flash de contenido no estilizado.
 */
function getInitialTheme(): Theme {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('glyphlog-theme')
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // localStorage puede no estar disponible en entornos de test o SSR
    }
  }
  return 'light'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),

  setTheme: (theme: Theme) => {
    localStorage.setItem('glyphlog-theme', theme)
    set({ theme })
  },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('glyphlog-theme', next)
      return { theme: next }
    }),
}))
