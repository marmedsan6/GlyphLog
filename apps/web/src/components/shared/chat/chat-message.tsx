import { cn } from '@/lib/utils'
import type { AIChatMessage } from '@/hooks/useAIChat'

interface ChatMessageProps {
  message: AIChatMessage
  isStreaming?: boolean
}

/**
 * Burbuja de un mensaje del chat: usuario a la derecha (acento), GlyphAI a la
 * izquierda (superficie). Muestra un indicador pulsante mientras el asistente
 * genera su respuesta (burbuja vacía + isStreaming).
 */
export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-muted text-foreground'
        )}
      >
        {message.content === '' && isStreaming ? (
          <span className="inline-flex gap-1" aria-label="GlyphAI está escribiendo">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce [animation-delay:150ms]">●</span>
            <span className="animate-bounce [animation-delay:300ms]">●</span>
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  )
}
