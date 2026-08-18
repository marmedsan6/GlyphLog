import { cn } from '@/lib/utils'
import type { EntryFilterType } from '@/hooks/useEntries'

interface FilterOption {
  value: EntryFilterType
  label: string
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'game', label: 'Juego' },
]

interface EntryFiltersProps {
  activeType: EntryFilterType
  onChange: (type: EntryFilterType) => void
}

export function EntryFilters({ activeType, onChange }: EntryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={activeType === option.value}
          className={cn(
            'rounded-[2px] border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors',
            activeType === option.value
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
