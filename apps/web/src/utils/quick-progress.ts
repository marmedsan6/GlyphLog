import type { EntryListItem, ProgressUnit } from '@/types'
import { formatProgressValue } from './progress-labels'

export interface QuickProgressAction {
  available: boolean
  increment: number
  newValue: number
  reachesTotal: boolean
  label: string
  progressText: string
}

const INCREMENTS: Record<ProgressUnit, number> = {
  episodes: 1,
  chapters: 1,
  volumes: 1,
  minutes: 30,
  percentage: 5,
  hours: 0.5,
}

const UNIT_LABELS: Record<ProgressUnit, string> = {
  episodes: 'ep.',
  chapters: 'cap.',
  volumes: 'vol.',
  minutes: 'min',
  percentage: '%',
  hours: 'h',
}

export function getQuickProgressAction(entry: EntryListItem): QuickProgressAction {
  const { progress_unit, progress_total, current_progress, status } = entry

  // Si no tiene unidad configurada o está completada/abandonada, no hay acción rápida disponible
  if (!progress_unit || status === 'completed' || status === 'dropped') {
    return {
      available: false,
      increment: 0,
      newValue: 0,
      reachesTotal: false,
      label: '',
      progressText: '',
    }
  }

  const current = current_progress ?? 0
  const total = progress_total ?? null
  const increment = INCREMENTS[progress_unit] ?? 1
  const unitLabel = UNIT_LABELS[progress_unit] ?? ''

  // Si ya alcanzó el total, no está disponible
  if (total !== null && current >= total) {
    return {
      available: false,
      increment: 0,
      newValue: current,
      reachesTotal: false,
      label: '',
      progressText: `${current}/${total} ${unitLabel}`,
    }
  }

  // Calcular nuevo valor clampeando al total
  let newValue = current + increment
  if (total !== null && newValue > total) {
    newValue = total
  }

  const reachesTotal = total !== null && newValue === total && current < total
  const label = `+${increment}${progress_unit === 'percentage' ? '%' : ' ' + unitLabel}`
  const totalText = total !== null ? formatProgressValue(total, progress_unit) : '—'
  const progressText = `${formatProgressValue(current, progress_unit)}/${totalText} ${unitLabel}`

  return {
    available: true,
    increment,
    newValue,
    reachesTotal,
    label,
    progressText,
  }
}
