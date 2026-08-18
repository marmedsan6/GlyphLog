import { Loader2, Sparkles, Youtube } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIChatMessage } from '@/hooks/useAIChat'
import { ChatRecommendationList } from '@/components/shared/chat/chat-recommendation-list'
import { ChatYoutubeSuggestionList } from '@/components/shared/chat/chat-youtube-suggestion-list'

interface ChatMessageProps {
  message: AIChatMessage
  isStreaming?: boolean
}

/**
 * Burbuja de un mensaje del chat: usuario a la derecha (acento), GlyphAI a la
 * izquierda (superficie). Muestra un indicador pulsante mientras el asistente
 * genera su respuesta (burbuja vacía + isStreaming). Si el mensaje lleva
 * `metadata.recommendations` o `metadata.suggestions`, renderiza las tarjetas
 * debajo del texto.
 */
export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const hasRecommendations = (message.metadata?.recommendations?.length ?? 0) > 0
  const hasSuggestions = (message.metadata?.suggestions?.length ?? 0) > 0
  const loadingType = message.metadata?.loading

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
        {loadingType === 'youtube' ? (
          <div className="flex flex-col gap-2 py-1 min-w-[240px] sm:min-w-[300px]">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Youtube className="h-4 w-4 text-red-500 animate-pulse" />
              <span>Analizando canales de YouTube…</span>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
            </div>
            <p className="text-xs text-muted-foreground">
              Extrayendo vídeos recientes y analizando menciones de anime, manga y juegos con IA.
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-2/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
          </div>
        ) : loadingType === 'recommendations' ? (
          <div className="flex flex-col gap-2 py-1 min-w-[240px] sm:min-w-[300px]">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              <span>Generando recomendaciones…</span>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
            </div>
            <p className="text-xs text-muted-foreground">
              Analizando tu colección para encontrar las mejores sugerencias personalizadas.
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-2/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
          </div>
        ) : message.content === '' && isStreaming ? (
          <span className="inline-flex gap-1" aria-label="GlyphAI está escribiendo">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce [animation-delay:150ms]">●</span>
            <span className="animate-bounce [animation-delay:300ms]">●</span>
          </span>
        ) : (
          message.content
        )}
        {hasRecommendations && (
          <ChatRecommendationList recommendations={message.metadata!.recommendations!} />
        )}
        {hasSuggestions && (
          <ChatYoutubeSuggestionList suggestions={message.metadata!.suggestions!} />
        )}
      </div>
    </div>
  )
}
