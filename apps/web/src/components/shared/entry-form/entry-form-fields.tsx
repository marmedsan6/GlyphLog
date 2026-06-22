import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { EntryStatusSelect } from './entry-status-select'
import { EntryTypeSelect } from './entry-type-select'
import { OptionalFields } from './optional-fields'
import type { EntryFormValues } from './entry-form-schema'

export function EntryFormFields() {
  const { control } = useFormContext<EntryFormValues>()

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: One Piece, Elden Ring..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <EntryTypeSelect />
      <EntryStatusSelect />
      <OptionalFields />
    </div>
  )
}
