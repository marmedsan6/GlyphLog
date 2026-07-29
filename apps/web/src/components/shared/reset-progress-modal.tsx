import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
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
import { FIXED_PROGRESS_UNIT } from '@/components/shared/entry-form'
import type { EntryType } from '@/types'

const UNIT_LABELS: Record<(typeof FIXED_PROGRESS_UNIT)[EntryType], string> = {
  episodes: 'episodios',
  chapters: 'capítulos',
  hours: 'horas',
}

const TYPE_LABELS: Record<EntryType, string> = {
  anime: 'anime',
  manga: 'manga',
  game: 'videojuego',
}

export interface ResetProgressModalConfig {
  type: EntryType
  progress_total?: number | null
}

interface ResetProgressModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ResetProgressModalConfig
  onConfirm: (reason: string | null) => Promise<void>
  isLoading?: boolean
}

export function ResetProgressModal({
  open,
  onOpenChange,
  config,
  onConfirm,
  isLoading = false,
}: ResetProgressModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    setReason('')
    setError(null)
    onOpenChange(false)
  }

  async function handleConfirm() {
    setError(null)
    try {
      await onConfirm(reason.trim() || null)
      setReason('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reiniciar el progreso')
    }
  }

  const unitLabel = UNIT_LABELS[FIXED_PROGRESS_UNIT[config.type]]
  const totalLabel = config.progress_total ?? 'sin definir'

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Reiniciar progreso
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p>
                Esta entrada tiene historial de progreso. Para aplicar los cambios de configuración
                debes reiniciarlo. Esta acción no se puede deshacer.
              </p>

              <div className="rounded-md bg-muted p-3 text-sm">
                <p>
                  <span className="font-medium">Nueva configuración:</span>
                </p>
                <ul className="mt-1 list-inside list-disc">
                  <li>Tipo: {TYPE_LABELS[config.type]}</li>
                  <li>Unidad: {unitLabel}</li>
                  <li>Total esperado: {totalLabel}</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-reason">Motivo (opcional)</Label>
                <Input
                  id="reset-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: cambio de formato de seguimiento"
                  disabled={isLoading}
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
            disabled={isLoading}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {isLoading ? 'Reiniciando...' : 'Reiniciar y guardar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
