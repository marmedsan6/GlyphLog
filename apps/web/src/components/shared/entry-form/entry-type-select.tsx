import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { EntryType } from '@/types'
import type { EntryFormValues } from './entry-form-schema'

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'game', label: 'Videojuego' },
]

export function EntryTypeSelect() {
  const { control, setValue } = useFormContext<EntryFormValues>()

  return (
    <FormField
      control={control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo</FormLabel>
          <FormControl>
            <select
              id={field.name}
              value={field.value}
              onChange={(e) => {
                const newType = e.target.value as EntryType
                field.onChange(newType)
                // Al cambiar el tipo, resetear estado a 'watching' para mantener
                // coherencia con las labels traducidas.
                setValue('status', 'watching')
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
