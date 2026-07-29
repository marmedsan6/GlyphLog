import { useFormContext } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { STATUS_LABELS } from '@/utils/entry-labels'
import type { EntryStatus } from '@/types'
import type { EntryFormValues } from './entry-form-schema'

export function EntryStatusSelect() {
  const { control, watch } = useFormContext<EntryFormValues>()
  const type = watch('type')

  return (
    <FormField
      control={control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Estado</FormLabel>
          <FormControl>
            <select
              id={field.name}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value as EntryStatus)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {Object.entries(STATUS_LABELS[type]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
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
