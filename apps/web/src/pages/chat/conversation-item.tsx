import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConversationListItem } from '@/services/ai.service'
import { Button } from '@/components/ui/button'

interface ConversationItemProps {
  conversation: ConversationListItem
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

/** Fecha relativa corta (p.ej. "hace 5 min", "ayer", "12 jul"). */
function relativeDate(dateIso: string): string {
  const date = new Date(dateIso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/**
 * Item de la sidebar de conversaciones: título, fecha relativa y borrar.
 * El botón de borrar detiene la propagación para no seleccionar el item.
 */
export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSelect()
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{conversation.title}</p>
        <p className="text-xs text-muted-foreground/80">
          {relativeDate(conversation.updated_at)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Eliminar conversación ${conversation.title}`}
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  )
}
