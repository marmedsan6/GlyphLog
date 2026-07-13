import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { disabledBgOpacity } from '@/lib/tailwind-opacity'
import type { EntryType } from '@/types'
import type { EntryFormValues } from './entry-form-schema'

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'game', label: 'Videojuego' },
]

interface EntryTypeSelectProps {
  disabled?: boolean
}

export function EntryTypeSelect({ disabled = false }: EntryTypeSelectProps) {
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
              disabled={disabled}
              onChange={(e) => {
                const newType = e.target.value as EntryType
                field.onChange(newType)
                // Al cambiar el tipo, resetear estado a 'watching' para mantener
                // coherencia con las labels traducidas.
                setValue('status', 'watching')
              }}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-80',
                disabledBgOpacity.muted[0.5]
              )}
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
