import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useEntry } from '@/hooks/useEntry'
import { useUpdateEntry } from '@/hooks/useUpdateEntry'
import { useDeleteEntry } from '@/hooks/useDeleteEntry'
import { getApiErrorMessage, isConflictError } from '@/utils/api-errors'
import { ErrorState } from '@/components/shared/error-state'
import { EntryDetailSkeleton } from './entry-detail-skeleton'
import { EntryDetailView } from './entry-detail-view'
import { EntryEditForm } from './entry-edit-form'
import { type EntryFormValues } from '@/components/shared/entry-form'
import { useResetProgress } from '@/hooks/useResetProgress'
import { useUpdateProgress } from '@/hooks/useUpdateProgress'
import { UpdateProgressModal } from '@/components/shared/update-progress-modal'
import {
  ResetProgressModal,
  type ResetProgressModalConfig,
} from '@/components/shared/reset-progress-modal'
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

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [updateProgressOpen, setUpdateProgressOpen] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<{
    values: EntryFormValues
    coverImage: File | null
    keepCoverImage: boolean
  } | null>(null)
  const [resetModalConfig, setResetModalConfig] = useState<ResetProgressModalConfig>({
    type: 'anime',
    progress_total: null,
  })

  const entryId = id ?? ''
  const { data: entry, isLoading, isError, error, refetch } = useEntry(entryId)
  const { mutateAsync: updateEntryAsync, isPending: isUpdating } = useUpdateEntry(entryId)
  const { mutateAsync: deleteEntryAsync, isPending: isDeleting } = useDeleteEntry()
  const { mutateAsync: resetProgressAsync, isPending: isResetting } = useResetProgress(entryId)
  const { mutateAsync: updateProgressAsync, isPending: isUpdatingProgress } =
    useUpdateProgress(entryId)

  async function executeUpdate(
    values: EntryFormValues,
    coverImage: File | null,
    keepCoverImage: boolean
  ) {
    return updateEntryAsync({
      title: values.title,
      type: values.type,
      status: values.status,
      rating: values.rating || null,
      year: values.year || null,
      notes: values.notes || null,
      progress_total: values.progress_total || null,
      cover_image: coverImage ?? (keepCoverImage ? undefined : null),
    })
  }

  async function handleEditSubmit(
    values: EntryFormValues,
    coverImage: File | null,
    keepCoverImage: boolean
  ) {
    try {
      await executeUpdate(values, coverImage, keepCoverImage)
      setIsEditing(false)
      toast({
        title: 'Entrada actualizada',
        description: 'Los cambios se han guardado correctamente.',
      })
    } catch (err) {
      if (isConflictError(err)) {
        setPendingUpdate({ values, coverImage, keepCoverImage })
        setResetModalConfig({
          type: values.type,
          progress_total: values.progress_total ? parseFloat(values.progress_total) : null,
        })
        setResetModalOpen(true)
        return
      }

      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: getApiErrorMessage(err),
      })
    }
  }

  async function handleResetConfirm(reason: string | null) {
    if (!pendingUpdate) return

    const { values, coverImage, keepCoverImage } = pendingUpdate

    await resetProgressAsync({
      reason,
      new_type: values.type,
      new_progress_total: values.progress_total ? parseFloat(values.progress_total) : null,
    })

    await executeUpdate(values, coverImage, keepCoverImage)
    setPendingUpdate(null)
    setIsEditing(false)
    toast({
      title: 'Progreso reiniciado',
      description: 'La configuración se ha actualizado y el historial se ha reiniciado.',
    })
  }

  async function handleProgressUpdateConfirm(
    newValue: number,
    note: string | null,
    markCompleted: boolean
  ) {
    try {
      await updateProgressAsync({
        new_value: newValue,
        note,
        mark_completed: markCompleted,
      })
      toast({
        title: 'Progreso actualizado',
        description: 'El progreso se ha guardado correctamente.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar progreso',
        description: getApiErrorMessage(err),
      })
      throw err
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
      navigate('/collection')
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
        message={error?.message || 'No se pudo cargar la entrada.'}
        onRetry={refetch}
        showBackButton
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate('/collection')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="edit-button">
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
                  <div className="bg-destructive/10 rounded-md p-3 text-sm text-destructive">
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
                    className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
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
        <EntryEditForm
          entry={entry}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
          isSubmitting={isUpdating}
        />
      ) : (
        <EntryDetailView entry={entry} onUpdateProgressClick={() => setUpdateProgressOpen(true)} />
      )}

      <ResetProgressModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        config={resetModalConfig}
        onConfirm={handleResetConfirm}
        isLoading={isResetting || isUpdating}
      />

      <UpdateProgressModal
        open={updateProgressOpen}
        onOpenChange={setUpdateProgressOpen}
        currentProgress={entry.current_progress ?? 0}
        progressTotal={entry.progress_total}
        progressUnit={entry.progress_unit}
        onConfirm={handleProgressUpdateConfirm}
        isLoading={isUpdatingProgress}
      />
    </div>
  )
}
