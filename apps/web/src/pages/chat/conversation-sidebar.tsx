import { Plus } from 'lucide-react'
import type { ConversationListItem } from '@/services/ai.service'
import { Button } from '@/components/ui/button'
import { ConversationItem } from '@/pages/chat/conversation-item'
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
import { useState } from 'react'

interface ConversationSidebarProps {
  conversations: ConversationListItem[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

/**
 * Sidebar izquierda de /chat: botón "Nueva conversación" + lista ordenada
 * por updated_at DESC. El borrado pide confirmación (AlertDialog).
 */
export function ConversationSidebar({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  onNew,
  onDelete,
}: ConversationSidebarProps) {
  const [pendingDelete, setPendingDelete] = useState<ConversationListItem | null>(null)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border">
      <div className="p-3">
        <Button onClick={onNew} className="w-full" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Nueva conversación
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3" aria-label="Conversaciones">
        {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Cargando…</p>}
        {!isLoading && conversations.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Aún no tienes conversaciones.
          </p>
        )}
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === selectedId}
            onSelect={() => onSelect(conversation.id)}
            onDelete={() => setPendingDelete(conversation)}
          />
        ))}
      </nav>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              «{pendingDelete?.title}» y todos sus mensajes se borrarán
              permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
