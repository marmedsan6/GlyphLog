import type { EntryStatus } from '@/types'

// Colores del sello de estado por estado, con variante para dark mode.
// Se mantienen como clases Tailwind para que el árbol de clases las detecte.
export const STATUS_STAMP_CLASSES: Record<EntryStatus, string> = {
  watching: 'text-blue-700 dark:text-blue-400 border-blue-700 dark:border-blue-400',
  completed: 'text-green-700 dark:text-green-400 border-green-700 dark:border-green-400',
  on_hold: 'text-amber-700 dark:text-amber-400 border-amber-700 dark:border-amber-400',
  dropped: 'text-red-700 dark:text-red-400 border-red-700 dark:border-red-400',
  plan_to_watch: 'text-stone-500 dark:text-stone-400 border-stone-500 dark:border-stone-400',
}
