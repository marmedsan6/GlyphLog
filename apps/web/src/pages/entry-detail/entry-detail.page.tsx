import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useEntry } from '@/hooks/useEntry'
import { useUpdateEntry } from '@/hooks/useUpdateEntry'
import { useDeleteEntry } from '@/hooks/useDeleteEntry'
import { getCoverImageUrl } from '@/utils/cover-image-url'
import { getApiErrorMessage } from '@/utils/api-errors'
import { getStatusLabel, getTypeLabel } from '@/utils/entry-labels'
import {
  EntryFormFields,
  entryFormSchema,
  ImageUploader,
  validateImageFile,
  type EntryFormValues,
} from '@/components/shared/entry-form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ErrorStateProps {
  error: Error
  onRetry: () => void
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => navigate('/collection')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a la colección
      </Button>
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive mb-4">
          {error.message || 'No se pudo cargar la entrada. Inténtalo de nuevo.'}
        </p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

function EntryDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-40 rounded bg-muted" />
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="aspect-[3/4] rounded-md bg-muted" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="h-6 w-1/2 rounded bg-muted" />
          <div className="h-6 w-1/3 rounded bg-muted" />
          <div className="h-32 w-full rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [keepCoverImage, setKeepCoverImage] = useState(true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const entryId = id ?? ''
  const {
    data: entry,
    isLoading,
    isError,
    error,
    refetch,
  } = useEntry(entryId)
  const { mutateAsync: updateEntryAsync, isPending: isUpdating } = useUpdateEntry(entryId)
  const { mutateAsync: deleteEntryAsync, isPending: isDeleting } = useDeleteEntry()

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

  // Al entrar en modo edición cargamos los datos actuales en el formulario.
  // keepDirtyValues evita que un refetch en background sobrescriba cambios
  // no guardados del usuario mientras edita.
  useEffect(() => {
    if (entry && isEditing) {
      const values: EntryFormValues = {
        title: entry.title,
        type: entry.type,
        status: entry.status,
        rating: entry.rating?.toString() ?? '',
        year: entry.year?.toString() ?? '',
        notes: entry.notes ?? '',
      }
      form.reset(values, { keepDirtyValues: true })
      setKeepCoverImage(true)
      setSelectedImage(null)
      setImageError(null)
    }
  }, [entry, isEditing, form])

  function handleImageChange(file: File | null) {
    const validationError = validateImageFile(file)
    setImageError(validationError)
    setSelectedImage(validationError ? null : file)
  }

  function handleRemoveImage() {
    setKeepCoverImage(false)
    setSelectedImage(null)
    setImageError(null)
  }

  function handleCancelEdit(): void {
    if (form.formState.isDirty || selectedImage !== null || !keepCoverImage) {
      const confirmed = window.confirm(
        'Tienes cambios sin guardar. ¿Seguro que quieres cancelar?'
      )
      if (!confirmed) {
        return
      }
    }

    setIsEditing(false)
    setKeepCoverImage(true)
    setSelectedImage(null)
    setImageError(null)
    form.reset()
  }

  async function onSubmit(values: EntryFormValues) {
    const validationError = validateImageFile(selectedImage)
    if (validationError) {
      setImageError(validationError)
      return
    }

    try {
      await updateEntryAsync({
        title: values.title,
        type: values.type,
        status: values.status,
        rating: values.rating ?? null,
        year: values.year ?? null,
        notes: values.notes ?? null,
        cover_image: selectedImage ?? (keepCoverImage ? undefined : null),
      })
      setIsEditing(false)
      setSelectedImage(null)
      setImageError(null)
      toast({
        title: 'Entrada actualizada',
        description: 'Los cambios se han guardado correctamente.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: getApiErrorMessage(err),
      })
    }
  }

  async function handleDelete(): Promise<void> {
    setDeleteError(null)

    try {
      await deleteEntryAsync(entryId)
      setDeleteDialogOpen(false)
      toast({
        title: 'Entrada eliminada',
        description: 'La entrada se ha eliminado correctamente.',
      })
    } catch (err) {
      setDeleteError(getApiErrorMessage(err))
    }
  }

  if (isLoading) {
    return <EntryDetailSkeleton />
  }

  if (isError || !entry) {
    return (
      <ErrorState
        error={error ?? new Error('No se encontró la entrada')}
        onRetry={refetch}
      />
    )
  }

  const coverUrl = getCoverImageUrl(entry.cover_image)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate('/collection')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              data-testid="edit-button"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="delete-button">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar entrada?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente
                    <span className="font-medium text-foreground"> {entry.title}</span>.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {deleteError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {deleteError}
                  </div>
                )}

                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteError(null)}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault()
                      void handleDelete()
                    }}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar entrada</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <EntryFormFields />
                <ImageUploader
                  currentImageUrl={keepCoverImage ? coverUrl : null}
                  selectedImage={selectedImage}
                  onChange={handleImageChange}
                  onRemove={handleRemoveImage}
                  error={imageError}
                  allowChange
                />
                {!keepCoverImage && selectedImage === null && (
                  <p className="text-sm text-muted-foreground">
                    La imagen actual se eliminará al guardar.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={isUpdating}>
                    {isUpdating ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={`Portada de ${entry.title}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-xs">Sin imagen</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{entry.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    {getTypeLabel(entry.type)} · {getStatusLabel(entry.type, entry.status)}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Puntuación</p>
                    <p className="text-lg font-medium">
                      {entry.rating != null ? entry.rating : '—'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Año</p>
                    <p className="text-lg font-medium">
                      {entry.year != null ? entry.year : '—'}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {entry.notes ?? 'Sin notas'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
