import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import type { ProgressUnit } from '@/types'
import { getProgressUnitLabel, formatProgressValue } from '@/utils/progress-labels'

interface UpdateProgressModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentProgress: number
  progressTotal: number | null
  progressUnit: ProgressUnit | null
  onConfirm: (newValue: number, note: string | null, markCompleted: boolean) => Promise<void>
  isLoading?: boolean
}

export function UpdateProgressModal({
  open,
  onOpenChange,
  currentProgress,
  progressTotal,
  progressUnit,
  onConfirm,
  isLoading = false,
}: UpdateProgressModalProps) {
  const allowDecimals = progressUnit === 'hours'
  const step = allowDecimals ? 0.25 : 1
  const adjustStep = allowDecimals ? 0.5 : 1

  const [newValueStr, setNewValueStr] = useState(
    formatProgressValue(currentProgress, progressUnit)
  )
  const [note, setNote] = useState('')
  const [markCompleted, setMarkCompleted] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reset/sync local state when modal opens or progress changes
  useEffect(() => {
    if (open) {
      setNewValueStr(formatProgressValue(currentProgress, progressUnit))
      setNote('')
      setMarkCompleted(true)
      setError(null)
    }
  }, [open, currentProgress, progressUnit])

  const parsedValue = allowDecimals ? parseFloat(newValueStr) : parseInt(newValueStr, 10)
  const newValue = isNaN(parsedValue) ? 0 : parsedValue
  const isInvalid =
    isNaN(parsedValue) ||
    parsedValue < 0 ||
    (progressTotal !== null && parsedValue > progressTotal)

  let validationError = ''
  if (newValueStr !== '') {
    if (isNaN(parsedValue)) {
      validationError = 'El progreso debe ser un número'
    } else if (parsedValue < 0) {
      validationError = 'El progreso no puede ser negativo'
    } else if (progressTotal !== null && parsedValue > progressTotal) {
      validationError = `El progreso no puede superar el total (${progressTotal})`
    } else if (!allowDecimals && parsedValue !== Math.round(parsedValue)) {
      validationError = 'El progreso debe ser un número entero'
    } else if (allowDecimals && !/^\d+\.?\d{0,2}$/.test(newValueStr)) {
      validationError = 'El progreso debe tener como máximo 2 decimales'
    }
  }

  const showCompletionPrompt =
    progressTotal !== null && newValue === progressTotal && !isInvalid

  function handleCancel() {
    setNewValueStr(formatProgressValue(currentProgress, progressUnit))
    setNote('')
    setError(null)
    onOpenChange(false)
  }

  async function handleConfirm() {
    if (isInvalid) return
    setError(null)
    try {
      await onConfirm(newValue, note.trim() || null, showCompletionPrompt ? markCompleted : false)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el progreso')
    }
  }

  function adjustValue(amount: number) {
    const current = isNaN(parsedValue) ? 0 : parsedValue
    const nextValue = Math.max(
      0,
      progressTotal !== null ? Math.min(progressTotal, current + amount) : current + amount
    )
    setNewValueStr(allowDecimals ? nextValue.toFixed(2).replace(/\.?0+$/, '') : String(nextValue))
  }

  const unitLabel = getProgressUnitLabel(progressUnit)

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Actualizar progreso</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="mt-2 space-y-4 text-left">
              <div className="flex items-center justify-between rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Progreso actual:</span>
                <span className="font-semibold text-foreground">
                  {formatProgressValue(currentProgress, progressUnit)} / {formatProgressValue(progressTotal, progressUnit)} {unitLabel}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="progress-value">Nuevo valor ({unitLabel})</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustValue(-adjustStep)}
                    disabled={isLoading || (parseFloat(newValueStr) || 0) <= 0}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <Input
                    id="progress-value"
                    type="number"
                    min="0"
                    max={progressTotal ?? undefined}
                    step={step}
                    value={newValueStr}
                    onChange={(e) => setNewValueStr(e.target.value)}
                    placeholder="0"
                    disabled={isLoading}
                    className="text-center font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue(adjustStep)}
                    disabled={
                      isLoading ||
                      (progressTotal !== null && (parseFloat(newValueStr) || 0) >= progressTotal)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {validationError && (
                  <p className="mt-1 text-xs text-destructive">{validationError}</p>
                )}
              </div>

              {showCompletionPrompt && (
                <div className="flex items-start space-x-2 rounded-md border border-green-500/20 bg-green-500/5 p-3 text-sm">
                  <input
                    type="checkbox"
                    id="mark-completed"
                    checked={markCompleted}
                    onChange={(e) => setMarkCompleted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-green-600 accent-green-600 focus:ring-green-500"
                  />
                  <div className="grid gap-1 leading-none">
                    <Label
                      htmlFor="mark-completed"
                      className="cursor-pointer text-sm font-medium text-green-900 dark:text-green-300"
                    >
                      ¿Completar entrada?
                    </Label>
                    <p className="text-xs text-green-700/80 dark:text-green-400/80">
                      Has alcanzado el total. Esto cambiará el estado de la entrada a "Completado".
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="progress-note">Nota (opcional)</Label>
                <textarea
                  id="progress-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Terminé el arco del desierto"
                  disabled={isLoading}
                  rows={3}
                  className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 rounded-md p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void handleConfirm()
            }}
            disabled={isLoading || isInvalid || newValueStr === ''}
          >
            {isLoading ? 'Guardando...' : 'Guardar progreso'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
