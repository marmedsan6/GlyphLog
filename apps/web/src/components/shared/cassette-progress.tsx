import { cn } from '@/lib/utils'
import { formatProgressValue } from '@/utils/progress-labels'
import type { ProgressUnit } from '@/types'

interface CassetteProgressProps {
  current: number | null | undefined
  total: number | null | undefined
  unit: ProgressUnit | null | undefined
  className?: string
}

const REEL_COUNT = 5

// Progreso representado como ruedas de cassette (5 ruedas rellenadas proporcionalmente).
export function CassetteProgress({ current, total, unit, className }: CassetteProgressProps) {
  const percentage = total
    ? Math.min(100, Math.max(0, ((current ?? 0) / total) * 100))
    : 0

  const filledReels = total ? Math.round((percentage / 100) * REEL_COUNT) : 0

  const currentText = formatProgressValue(current, unit)
  const totalText = formatProgressValue(total, unit)

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: REEL_COUNT }).map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-5 w-5 rounded-full border-2 border-foreground bg-muted',
                index < filledReels && 'border-primary bg-primary'
              )}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {total ? `${Math.round(percentage)}%` : '—'}
        </span>
      </div>
      <span className="font-mono text-xs text-foreground">
        {total != null ? `${currentText} / ${totalText}` : currentText}
      </span>
    </div>
  )
}
