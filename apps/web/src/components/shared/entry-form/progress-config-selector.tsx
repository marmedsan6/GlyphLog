import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Plus, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  MAX_PROGRESS_TOTAL,
  MIN_PROGRESS_TOTAL,
  FIXED_PROGRESS_UNIT,
  type EntryFormValues,
  type EntryType,
  type FixedProgressUnit,
  type ProgressTotalSource,
} from './entry-form-schema'

const UNIT_LABELS: Record<FixedProgressUnit, string> = {
  episodes: 'Episodios',
  chapters: 'Capítulos',
  hours: 'Horas',
}

interface ProgressConfigSelectorProps {
  progressTotalSource?: ProgressTotalSource | null
  onProgressTotalSource?: (source: ProgressTotalSource | null) => void
}

export function ProgressConfigSelector({
  progressTotalSource,
  onProgressTotalSource,
}: ProgressConfigSelectorProps) {
  const { control, setValue } = useFormContext<EntryFormValues>()
  const entryType = useWatch({ control, name: 'type' }) as EntryType
  const progressTotal = useWatch({ control, name: 'progress_total' })

  const fixedUnit = FIXED_PROGRESS_UNIT[entryType]
  const unitLabel = fixedUnit ? UNIT_LABELS[fixedUnit] : ''
  const isManualAllowed = entryType === 'anime' || entryType === 'manga'

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [manualTotal, setManualTotal] = useState('')

  function handleConfirmManualTotal() {
    const num = parseFloat(manualTotal)
    if (!isNaN(num) && num >= MIN_PROGRESS_TOTAL && num <= MAX_PROGRESS_TOTAL) {
      setValue('progress_total', String(num), { shouldValidate: true })
      onProgressTotalSource?.('manual')
    }
    setManualTotal('')
    setIsPopoverOpen(false)
  }

  function handleInputChange(value: string, onChange: (value: string) => void) {
    onChange(value)
    // Si el usuario toca el input directamente, marcamos el origen como manual
    // (a menos que no hubiera nada, en cuyo dejamos el origen anterior para no
    // sobreescribir un posible autocompletado con valor vacío accidental).
    if (value !== '' && progressTotalSource !== 'manual') {
      onProgressTotalSource?.('manual')
    }
  }

  return (
    <div className="mt-2 space-y-4 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">Configuración de progreso</p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Unidad de progreso</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{unitLabel}</span>
          {isManualAllowed && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs font-semibold text-primary"
                  aria-label="Añadir total esperado manualmente"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Total
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Añadir total ({unitLabel})</p>
                  <Input
                    type="number"
                    min={MIN_PROGRESS_TOTAL}
                    max={MAX_PROGRESS_TOTAL}
                    step="1"
                    placeholder="Ej: 24"
                    value={manualTotal}
                    onChange={(e) => setManualTotal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleConfirmManualTotal()
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 flex-1"
                      onClick={handleConfirmManualTotal}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1"
                      onClick={() => {
                        setManualTotal('')
                        setIsPopoverOpen(false)
                      }}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <FormField
        control={control}
        name="progress_total"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Total esperado (opcional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={MIN_PROGRESS_TOTAL}
                max={MAX_PROGRESS_TOTAL}
                placeholder="Ej: 12"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => handleInputChange(e.target.value, field.onChange)}
              />
            </FormControl>
            {progressTotalSource && progressTotal && (
              <Badge
                variant={progressTotalSource === 'manual' ? 'outline' : 'secondary'}
                className="text-[10px]"
              >
                {progressTotalSource === 'manual'
                  ? 'Manual'
                  : progressTotalSource === 'RAWG'
                    ? `Sugerido: ${progressTotal} h (RAWG)`
                    : `Sugerido: ${progressTotal} (AniList)`}
              </Badge>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
