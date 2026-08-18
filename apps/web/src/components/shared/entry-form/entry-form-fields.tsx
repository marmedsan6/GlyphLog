import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { bgOpacity } from '@/lib/tailwind-opacity'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { EntryStatusSelect } from './entry-status-select'
import { EntryTypeSelect } from './entry-type-select'
import { OptionalFields } from './optional-fields'
import { ProgressConfigSelector } from './progress-config-selector'
import type { EntryFormValues, ProgressTotalSource } from './entry-form-schema'

interface EntryFormFieldsProps {
  isAutocompleted?: boolean
  progressTotalSource?: ProgressTotalSource | null
  onProgressTotalSource?: (source: ProgressTotalSource | null) => void
}

export function EntryFormFields({
  isAutocompleted = false,
  progressTotalSource,
  onProgressTotalSource,
}: EntryFormFieldsProps) {
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
                className={
                  isAutocompleted ? `${bgOpacity.muted[0.5]} cursor-not-allowed opacity-80` : ''
                }
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <EntryTypeSelect disabled={isAutocompleted} />
        <EntryStatusSelect />
      </div>
      <ProgressConfigSelector
        progressTotalSource={progressTotalSource}
        onProgressTotalSource={onProgressTotalSource}
      />
      <OptionalFields disabledYear={isAutocompleted} />
    </div>
  )
}
