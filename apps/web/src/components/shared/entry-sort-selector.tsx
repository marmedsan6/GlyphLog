import { ArrowUpDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SortField, SortOrder } from '@/types'

interface SortOption {
  value: string // Formato: "field:order"
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'created_at:desc', label: 'Más reciente' },
  { value: 'created_at:asc', label: 'Más antiguo' },
  { value: 'title:asc', label: 'Título A-Z' },
  { value: 'title:desc', label: 'Título Z-A' },
  { value: 'rating:desc', label: 'Mejor valorado' },
  { value: 'rating:asc', label: 'Peor valorado' },
]

interface EntrySortSelectorProps {
  sortBy: SortField
  sortOrder: SortOrder
  onSortChange: (sortBy: SortField, sortOrder: SortOrder) => void
}

export function EntrySortSelector({ sortBy, sortOrder, onSortChange }: EntrySortSelectorProps) {
  const currentValue = `${sortBy}:${sortOrder}`
  const activeOption = SORT_OPTIONS.find((opt) => opt.value === currentValue) || SORT_OPTIONS[0]

  function handleValueChange(value: string) {
    const [field, order] = value.split(':') as [SortField, SortOrder]
    onSortChange(field, order)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-medium">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Ordenar por: {activeOption.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={currentValue} onValueChange={handleValueChange}>
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="flex cursor-pointer items-center justify-between py-2 text-xs"
            >
              <span>{option.label}</span>
              {currentValue === option.value && <Check className="ml-2 h-3 w-3 text-primary" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
