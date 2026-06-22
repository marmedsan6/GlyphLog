import type { EntryStatus, EntryType } from '@/types'

export const TYPE_LABELS: Record<EntryType, string> = {
  anime: 'Anime',
  manga: 'Manga',
  game: 'Videojuego',
}

export const STATUS_LABELS: Record<EntryType, Record<EntryStatus, string>> = {
  anime: {
    watching: 'Viendo',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo ver',
  },
  manga: {
    watching: 'Leyendo',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo leer',
  },
  game: {
    watching: 'Jugando',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo jugar',
  },
}

export function getTypeLabel(type: EntryType): string {
  return TYPE_LABELS[type]
}

export function getStatusLabel(type: EntryType, status: EntryStatus): string {
  return STATUS_LABELS[type][status]
}
