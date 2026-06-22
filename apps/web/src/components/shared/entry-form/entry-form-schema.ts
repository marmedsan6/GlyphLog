import { z } from 'zod'

export const ENTRY_TITLE_MAX_LENGTH = 500
export const ENTRY_NOTES_MAX_LENGTH = 5000
export const MIN_RATING = 1.0
export const MAX_RATING = 10.0
export const MIN_YEAR = 1950
export const MAX_YEAR = 2100

// Schema base compartido entre creación y edición de entradas.
// rating y year se mantienen como string para poder representar inputs vacíos
// y validar el rango numérico de forma controlada.
export const entryFormSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es obligatorio')
    .max(ENTRY_TITLE_MAX_LENGTH, `El título no puede superar los ${ENTRY_TITLE_MAX_LENGTH} caracteres`),
  type: z.enum(['anime', 'manga', 'game']),
  status: z.enum(['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']),
  rating: z
    .string()
    .refine(
      (value) => {
        if (value === '') return true
        const num = parseFloat(value)
        return !isNaN(num) && num >= MIN_RATING && num <= MAX_RATING
      },
      { message: `La puntuación debe estar entre ${MIN_RATING} y ${MAX_RATING}` }
    )
    .optional(),
  year: z
    .string()
    .refine(
      (value) => {
        if (value === '') return true
        const num = parseInt(value, 10)
        return !isNaN(num) && num >= MIN_YEAR && num <= MAX_YEAR
      },
      { message: `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}` }
    )
    .optional(),
  notes: z
    .string()
    .max(ENTRY_NOTES_MAX_LENGTH, `Las notas no pueden superar los ${ENTRY_NOTES_MAX_LENGTH} caracteres`)
    .optional(),
})

export type EntryFormValues = z.infer<typeof entryFormSchema>
