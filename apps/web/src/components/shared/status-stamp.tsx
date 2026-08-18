import { cn } from '@/lib/utils'
import { getStatusLabel } from '@/utils/entry-labels'
import { STATUS_STAMP_CLASSES } from '@/utils/status-colors'
import type { EntryStatus, EntryType } from '@/types'

interface StatusStampProps {
  type: EntryType
  status: EntryStatus
  className?: string
}

// Sello de estado rotado, en tipografía mono y con borde de color por estado.
export function StatusStamp({ type, status, className }: StatusStampProps) {
  const label = getStatusLabel(type, status)

  return (
    <span
      className={cn(
        'inline-flex rotate-6 items-center rounded-[2px] border-2 bg-background/85 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest',
        STATUS_STAMP_CLASSES[status],
        className
      )}
    >
      {label}
    </span>
  )
}
