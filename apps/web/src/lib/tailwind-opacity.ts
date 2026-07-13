/**
 * Helpers de clases de Tailwind para colores con opacidad usando oklch.
 *
 * Tailwind 3.x no compone correctamente opacity modifiers (ej. bg-popover/95)
 * sobre colores definidos como `oklch(var(--color))`. Estos objetos exponen la
 * sintaxis arbitrary value equivalente con el canal alpha explicitado de forma
 * centralizada y type-safe.
 *
 * @example
 * // ❌ No funciona con colores oklch
 * <div className="bg-popover / 95" />
 *
 * // ✅ Funciona correctamente en light y dark mode
 * <div className={ bgOpacity.popover[0.95] } />
 */

export const bgOpacity = {
  popover: {
    0.95: 'bg-[oklch(var(--popover)/0.95)]',
    0.9: 'bg-[oklch(var(--popover)/0.9)]',
  },
  muted: {
    0.7: 'bg-[oklch(var(--muted)/0.7)]',
    0.5: 'bg-[oklch(var(--muted)/0.5)]',
    0.3: 'bg-[oklch(var(--muted)/0.3)]',
  },
  accent: {
    0.4: 'bg-[oklch(var(--accent)/0.4)]',
    0.3: 'bg-[oklch(var(--accent)/0.3)]',
  },
} as const

export const hoverBgOpacity = {
  muted: {
    0.7: 'hover:bg-[oklch(var(--muted)/0.7)]',
  },
} as const

export const disabledBgOpacity = {
  muted: {
    0.5: 'disabled:bg-[oklch(var(--muted)/0.5)]',
  },
} as const
