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

interface ConfirmCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryTitle: string
  onConfirm: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
}

export function ConfirmCompletionDialog({
  open,
  onOpenChange,
  entryTitle,
  onConfirm,
  onCancel,
}: ConfirmCompletionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>¿Completar entrada?</AlertDialogTitle>
          <AlertDialogDescription>
            Has alcanzado el progreso total para{' '}
            <span className="font-semibold text-foreground">"{entryTitle}"</span>. ¿Quieres marcar
            esta entrada como <span className="font-medium text-foreground">"Completado"</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              void onCancel(e)
            }}
            className="border-border text-foreground hover:bg-accent"
          >
            Mantener en progreso
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              void onConfirm(e)
            }}
          >
            Marcar como completada
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
