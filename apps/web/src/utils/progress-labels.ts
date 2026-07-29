import type { ProgressUnit } from '@/types'

export const PROGRESS_UNIT_LABELS: Record<ProgressUnit, string> = {
  episodes: 'episodios',
  chapters: 'capítulos',
  volumes: 'volúmenes',
  minutes: 'minutos',
  percentage: 'porcentaje',
  hours: 'horas',
}

export function getProgressUnitLabel(unit: ProgressUnit | null | undefined): string {
  if (!unit) return 'Sin unidad'
  return PROGRESS_UNIT_LABELS[unit]
}

export function formatProgressValue(value: number | null | undefined, unit: ProgressUnit | null | undefined): string {
  if (value == null) return '—'
  if (unit === 'hours') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
  }
  return String(Math.round(value))
}

export function formatProgress(
  current: number | null | undefined,
  total: number | null | undefined,
  unit: ProgressUnit | null | undefined
): string {
  if (current == null && total == null) {
    return 'Sin progreso registrado'
  }

  const label = getProgressUnitLabel(unit)
  const currentText = formatProgressValue(current, unit)
  const totalText = formatProgressValue(total, unit)

  return `${currentText} / ${totalText} ${label}`
}
