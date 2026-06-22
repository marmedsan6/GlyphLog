import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  ENTRY_NOTES_MAX_LENGTH,
  MAX_RATING,
  MAX_YEAR,
  MIN_RATING,
  MIN_YEAR,
  type EntryFormValues,
} from './entry-form-schema'

export function OptionalFields() {
  const { control } = useFormContext<EntryFormValues>()

  return (
    <div className="border-t border-border pt-4 mt-2">
      <p className="text-sm text-muted-foreground mb-3">Campos opcionales</p>
      <div className="space-y-4">
        <FormField
          control={control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Puntuación ({MIN_RATING} - {MAX_RATING})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min={MIN_RATING}
                  max={MAX_RATING}
                  placeholder="Ej: 8.5"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Año</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  placeholder="Ej: 2024"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between">
                <FormLabel>Notas</FormLabel>
                <span className="text-xs text-muted-foreground">
                  {field.value?.length ?? 0}/{ENTRY_NOTES_MAX_LENGTH}
                </span>
              </div>
              <FormControl>
                <textarea
                  id={field.name}
                  rows={4}
                  maxLength={ENTRY_NOTES_MAX_LENGTH}
                  placeholder="Tus notas sobre esta entrada..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
