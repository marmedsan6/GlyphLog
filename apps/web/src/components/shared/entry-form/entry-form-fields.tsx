import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { bgOpacity } from '@/lib/tailwind-opacity'
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

interface EntryFormFieldsProps {
  isAutocompleted?: boolean
}

export function EntryFormFields({ isAutocompleted = false }: EntryFormFieldsProps) {
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
                readOnly={isAutocompleted}
                className={isAutocompleted ? `${bgOpacity.muted[0.5]} cursor-not-allowed opacity-80` : ''}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <EntryTypeSelect disabled={isAutocompleted} />
      <EntryStatusSelect />
      <OptionalFields disabledYear={isAutocompleted} />
    </div>
  )
}
