import React, { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useQuickProgress } from '@/hooks/useQuickProgress'
import { getQuickProgressAction } from '@/utils/quick-progress'
import type { EntryListItem } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { getApiErrorMessage } from '@/utils/api-errors'
import { ConfirmCompletionDialog } from './confirm-completion-dialog'

interface QuickProgressButtonProps {
  entry: EntryListItem
}

export function QuickProgressButton({ entry }: QuickProgressButtonProps) {
  const { mutateAsync: quickProgress, isPending } = useQuickProgress()
  const { toast } = useToast()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const action = getQuickProgressAction(entry)

  if (!action.available) return null

  const percentage = entry.progress_total
    ? Math.min(100, Math.max(0, ((entry.current_progress ?? 0) / entry.progress_total) * 100))
    : 0

  const handlePlusClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPending) return

    if (action.reachesTotal) {
      // Si alcanza el total y ha acabado, mostramos confirmación
      setShowConfirmDialog(true)
    } else {
      // Si no alcanza el total, actualizamos directamente
      await performUpdate(action.newValue, false)
    }
  }

  const performUpdate = async (value: number, markCompleted: boolean) => {
    try {
      await quickProgress({
        entryId: entry.id,
        newValue: value,
        mark_completed: markCompleted,
      })
      toast({
        title: markCompleted ? '¡Entrada completada!' : 'Progreso actualizado',
        description: markCompleted
          ? `Has completado "${entry.title}" y su estado se actualizó a Completado.`
          : `Progreso de "${entry.title}" actualizado a ${action.progressText.split('/')[0]}/${entry.progress_total ?? '—'}`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar progreso',
        description: getApiErrorMessage(err),
      })
    }
  }

  const handleConfirmCompletion = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirmDialog(false)
    await performUpdate(action.newValue, true)
  }

  const handleCancelCompletion = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirmDialog(false)
    // El usuario alcanza el total pero decide NO marcarlo como completado (mantiene watching, etc.)
    await performUpdate(action.newValue, false)
  }

  return (
    <>
      <div
        className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/50 p-2 text-white backdrop-blur-md transition-all duration-200"
        onClick={(e) => {
          // Prevenir navegación si se hace clic en cualquier parte de la barra
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {/* Barra de progreso de fondo */}
        {entry.progress_total !== null && (
          <div className="absolute top-0 left-0 h-[2px] bg-white/20 w-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs font-medium text-white/90">
              {action.progressText}
            </span>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handlePlusClick}
            className="flex h-7 items-center gap-1 rounded-full bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            aria-label={`Incrementar progreso de ${entry.title}`}
          >
            {isPending ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
            ) : action.reachesTotal ? (
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            ) : (
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            )}
            <span>{action.label}</span>
          </button>
        </div>
      </div>

      <ConfirmCompletionDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        entryTitle={entry.title}
        onConfirm={handleConfirmCompletion}
        onCancel={handleCancelCompletion}
      />
    </>
  )
}
