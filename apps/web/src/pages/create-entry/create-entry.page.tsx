import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createEntry } from '@/services/entry.service'
import type { EntryType, EntryStatus } from '@/types'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const STATUS_LABELS: Record<EntryType, Record<EntryStatus, string>> = {
  anime: {
    watching: 'Viendo',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo ver',
  },
  manga: {
    watching: 'Leyendo',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo leer',
  },
  game: {
    watching: 'Jugando',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo jugar',
  },
}

// ── Zod schema del formulario ────────────────────────────────────────────────
// Se mantiene lo más cercano posible al schema EntryCreate del backend,
// pero con los campos rating/year como strings para manejar inputs vacíos.
const entryFormSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es obligatorio')
    .max(500, 'El título no puede superar los 500 caracteres'),
  type: z.enum(['anime', 'manga', 'game']),
  status: z.enum(['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']),
  rating: z
    .string()
    .refine(
      (value) => {
        if (value === '') return true
        const num = parseFloat(value)
        return !isNaN(num) && num >= 1 && num <= 10
      },
      { message: 'La puntuación debe estar entre 1.0 y 10.0' }
    )
    .optional(),
  year: z
    .string()
    .refine(
      (value) => {
        if (value === '') return true
        const num = parseInt(value, 10)
        return !isNaN(num) && num >= 1950 && num <= 2100
      },
      { message: 'El año debe estar entre 1950 y 2100' }
    )
    .optional(),
  notes: z
    .string()
    .max(5000, 'Las notas no pueden superar los 5000 caracteres')
    .optional(),
})

type EntryFormValues = z.infer<typeof entryFormSchema>

// ── Subcomponentes del formulario ────────────────────────────────────────────

function EntryTypeSelect() {
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
              <option value="anime">Anime</option>
              <option value="manga">Manga</option>
              <option value="game">Videojuego</option>
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function EntryStatusSelect() {
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

function OptionalFields() {
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
              <FormLabel>Puntuación (1.0 - 10.0)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="10.0"
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
                  min="1950"
                  max="2100"
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
                  {field.value?.length ?? 0}/5000
                </span>
              </div>
              <FormControl>
                <textarea
                  id={field.name}
                  rows={4}
                  maxLength={5000}
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

interface ImageUploaderProps {
  coverImage: File | null
  onChange: (file: File | null) => void
  error?: string | null
}

function ImageUploader({ coverImage, onChange, error }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)

  // Liberar ObjectURL para evitar fugas de memoria.
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  function handleFileChange(file: File | null) {
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
    onChange(file)
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="cover_image"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Imagen de portada (JPG, PNG o WebP, máx. 5MB)
      </label>
      <Input
        id="cover_image"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {preview && coverImage && (
        <div className="relative mt-2">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 object-cover rounded-md border border-border"
          />
          <button
            type="button"
            onClick={() => handleFileChange(null)}
            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 text-xs flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function FormActions({ isLoading }: { isLoading: boolean }) {
  const navigate = useNavigate()

  return (
    <div className="flex gap-2">
      <Button type="submit" className="flex-1" disabled={isLoading}>
        {isLoading ? 'Creando...' : 'Crear entrada'}
      </Button>
      <Button type="button" variant="outline" onClick={() => navigate('/collection')}>
        Cancelar
      </Button>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export function CreateEntryPage() {
  const navigate = useNavigate()
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      title: '',
      type: 'anime',
      status: 'watching',
      rating: '',
      year: '',
      notes: '',
    },
  })

  function validateImage(file: File | null): string | null {
    if (!file) return null
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'La imagen debe ser JPG, PNG o WebP'
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return 'La imagen no puede superar los 5MB'
    }
    return null
  }

  function handleImageChange(file: File | null) {
    const error = validateImage(file)
    setImageError(error)
    setCoverImage(error ? null : file)
  }

  async function onSubmit(values: EntryFormValues) {
    setApiError(null)

    const imageValidationError = validateImage(coverImage)
    if (imageValidationError) {
      setImageError(imageValidationError)
      return
    }

    setIsLoading(true)
    try {
      await createEntry({
        title: values.title.trim(),
        type: values.type,
        status: values.status,
        rating: values.rating ? parseFloat(values.rating) : null,
        year: values.year ? parseInt(values.year, 10) : null,
        notes: values.notes?.trim() || null,
        cover_image: coverImage,
      })
      navigate('/collection')
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const { data } = err.response
        if (typeof data.detail === 'string') {
          setApiError(data.detail)
        } else {
          setApiError('Error inesperado. Inténtalo de nuevo.')
        }
      } else {
        setApiError('Error inesperado. Inténtalo de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl">Nueva entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {apiError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {apiError}
                </div>
              )}

              <FormField
                control={form.control}
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
              <ImageUploader
                coverImage={coverImage}
                onChange={handleImageChange}
                error={imageError}
              />
              <FormActions isLoading={isLoading} />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
