import type { ProgressHistoryEvent } from '@/services/entry.service'
import { getProgressUnitLabel, formatProgressValue } from './progress-labels'


export function formatRelativeDate(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) {
    return 'hace un momento'
  }

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
  }

  return formatAbsoluteDate(isoDate)
}

export function formatAbsoluteDate(isoDate: string): string {
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDelta(
  delta: number | null,
  eventType: 'update' | 'reset'
): { text: string; className: string } {
  if (eventType === 'reset') {
    return { text: 'Reinicio', className: 'text-amber-600 dark:text-amber-400 font-semibold' }
  }

  if (delta == null) {
    return { text: '', className: '' }
  }

  if (delta > 0) {
    return { text: `+${delta}`, className: 'text-emerald-600 dark:text-emerald-400 font-semibold' }
  }

  if (delta < 0) {
    return { text: `${delta}`, className: 'text-rose-600 dark:text-rose-400 font-semibold' }
  }

  return { text: '0', className: 'text-muted-foreground' }
}

export function formatEventDescription(event: ProgressHistoryEvent): string {
  const unitLabel = getProgressUnitLabel(event.unit)
  const unit = event.unit

  if (event.event_type === 'reset') {
    if (event.previous_value != null) {
      return `Seguimiento reiniciado (${unitLabel} ${formatProgressValue(event.previous_value, unit)} → 0)`
    }
    return `Seguimiento reiniciado a 0`
  }

  const prev = event.previous_value != null ? event.previous_value : 0
  return `${unitLabel} ${formatProgressValue(prev, unit)} → ${formatProgressValue(event.current_value, unit)}`
}

