import { Button } from '@/components/ui/button'
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
        <Button
          key={option.value}
          type="button"
          variant={activeType === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
          aria-pressed={activeType === option.value}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
