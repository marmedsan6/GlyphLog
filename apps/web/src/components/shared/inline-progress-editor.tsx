import React, { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { useQuickProgress } from '@/hooks/useQuickProgress'
import { formatProgressValue } from '@/utils/progress-labels'
import { useToast } from '@/hooks/use-toast'
import { getApiErrorMessage } from '@/utils/api-errors'
import { ConfirmCompletionDialog } from './confirm-completion-dialog'
import type { EntryListItem, ProgressUnit } from '@/types'

const DECIMAL_UNITS: Set<ProgressUnit> = new Set(['hours'])

function allowsDecimals(unit: ProgressUnit | null | undefined): boolean {
  return unit != null && DECIMAL_UNITS.has(unit)
}

function validateValue(
  raw: string,
  unit: ProgressUnit | null | undefined,
  total: number | null | undefined
): { valid: boolean; parsed: number; error?: string } {
  const trimmed = raw.trim()
  if (trimmed === '') return { valid: false, parsed: 0, error: 'Introduce un valor' }

  const num = Number(trimmed)
  if (Number.isNaN(num)) return { valid: false, parsed: 0, error: 'Valor no válido' }
  if (num < 0) return { valid: false, parsed: 0, error: 'El valor no puede ser negativo' }

  if (total != null && num > total) {
    return { valid: false, parsed: 0, error: `El valor no puede superar ${total}` }
  }

  if (!allowsDecimals(unit) && !Number.isInteger(num)) {
    return { valid: false, parsed: 0, error: 'Solo se permiten números enteros para este tipo' }
  }

  if (allowsDecimals(unit)) {
    const decimals = trimmed.includes('.') ? trimmed.split('.')[1].length : 0
    if (decimals > 2) {
      return { valid: false, parsed: 0, error: 'Máximo 2 decimales' }
    }
  }

  return { valid: true, parsed: num }
}

interface InlineProgressEditorProps {
  entry: EntryListItem
  // Render opcional para el estado de solo-lectura (p. ej. cassette).
  // Permite reutilizar la lógica de edición sin duplicar el componente.
  // Recibe `displayText` para que el caller pueda exponer el valor actual en
  // el aria-label (accesibilidad y selectores E2E).
  renderDisplay?: (openEditor: (e: React.MouseEvent) => void, displayText: string) => ReactNode
}

export function InlineProgressEditor({ entry, renderDisplay }: InlineProgressEditorProps) {
  const { mutateAsync: quickProgress, isPending } = useQuickProgress()
  const { toast } = useToast()

  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = entry.current_progress ?? 0
  const total = entry.progress_total ?? null
  const unit = entry.progress_unit

  const displayText = `${formatProgressValue(current, unit)}${total != null ? ` / ${formatProgressValue(total, unit)}` : ''}`

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const handleOpenEditor = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isPending) return
      setInputValue(String(current))
      setValidationError(null)
      setEditing(true)
    },
    [current, isPending]
  )

  const performUpdate = useCallback(
    async (newValue: number, markCompleted: boolean) => {
      try {
        await quickProgress({
          entryId: entry.id,
          newValue,
          mark_completed: markCompleted,
        })
        toast({
          title: markCompleted ? '¡Entrada completada!' : 'Progreso actualizado',
          description: markCompleted
            ? `Has completado "${entry.title}" y su estado se actualizó a Completado.`
            : `Progreso de "${entry.title}" actualizado a ${displayText.split('/')[0]}/${total ?? '—'}`,
        })
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Error al actualizar progreso',
          description: getApiErrorMessage(err),
        })
      }
    },
    [quickProgress, entry.id, entry.title, displayText, total, toast]
  )

  const handleConfirm = useCallback(
    async (parsed: number) => {
      setEditing(false)
      const reachesTotal = total != null && parsed === total && current < total
      if (reachesTotal) {
        setShowConfirmDialog(true)
        return
      }
      await performUpdate(parsed, false)
    },
    [total, current, performUpdate]
  )

  const handleSubmit = useCallback(() => {
    const result = validateValue(inputValue, unit, total)
    if (!result.valid) {
      setValidationError(result.error ?? 'Valor no válido')
      return
    }
    void handleConfirm(result.parsed)
  }, [inputValue, unit, total, handleConfirm])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setValidationError(null)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSubmit, handleCancel]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      if (validationError) setValidationError(null)
    },
    [validationError]
  )

  const handleConfirmCompletion = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setShowConfirmDialog(false)
      await performUpdate(total!, true)
    },
    [performUpdate, total]
  )

  const handleCancelCompletion = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setShowConfirmDialog(false)
      await performUpdate(total!, false)
    },
    [performUpdate, total]
  )

  if (editing) {
    return (
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          min={0}
          max={total ?? undefined}
          step={allowsDecimals(unit) ? 0.5 : 1}
          className="h-7 w-20 rounded border border-input bg-background px-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={`Editar progreso de ${entry.title}`}
        />
        {total != null && (
          <span className="text-xs text-muted-foreground">/ {formatProgressValue(total, unit)}</span>
        )}
        {validationError && (
          <span className="text-xs text-destructive">{validationError}</span>
        )}
        {isPending && (
          <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        )}
      </div>
    )
  }

  return (
    <>
      {renderDisplay ? (
        renderDisplay(handleOpenEditor, displayText)
      ) : (
        <button
          type="button"
          onClick={handleOpenEditor}
          disabled={isPending}
          className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          aria-label={`Editar progreso de ${entry.title}: ${displayText}`}
        >
          <span>{displayText}</span>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}

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
