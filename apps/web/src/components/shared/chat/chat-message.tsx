import { Loader2, Sparkles, Youtube } from 'lucide-react'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { AIChatMessage } from '@/hooks/useAIChat'
import { ChatRecommendationList } from '@/components/shared/chat/chat-recommendation-list'
import { ChatYoutubeSuggestionList } from '@/components/shared/chat/chat-youtube-suggestion-list'

interface ChatMessageProps {
  message: AIChatMessage
  isStreaming?: boolean
}

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ node: _node, ...props }) => (
    <h1 className="mt-3 text-base font-bold first:mt-0" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="mt-3 text-sm font-bold first:mt-0" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="mt-2 text-sm font-semibold first:mt-0" {...props} />
  ),
  h4: ({ node: _node, ...props }) => (
    <h4 className="mt-2 text-sm font-semibold first:mt-0" {...props} />
  ),
  h5: ({ node: _node, ...props }) => (
    <h5 className="mt-2 text-xs font-semibold uppercase tracking-wide first:mt-0" {...props} />
  ),
  h6: ({ node: _node, ...props }) => (
    <h6 className="mt-2 text-xs font-medium uppercase tracking-wide first:mt-0" {...props} />
  ),
  p: ({ node: _node, ...props }) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
  li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-primary/50 pl-3 italic text-muted-foreground"
      {...props}
    />
  ),
  a: ({ node: _node, href, ...props }) => {
    const isExternal = href != null && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)

    return (
      <a
        {...props}
        href={href}
        className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      />
    )
  },
  code: ({ node: _node, className, ...props }) => (
    <code
      {...props}
      className={cn('rounded bg-background/70 px-1 py-0.5 font-mono text-[0.9em]', className)}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-2 max-w-full overflow-x-auto rounded-md border border-border/70 bg-background/70 p-3 font-mono text-xs leading-relaxed"
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-2 max-w-full overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-xs" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th className="border border-border/70 bg-background/50 px-2 py-1 font-semibold" {...props} />
  ),
  td: ({ node: _node, ...props }) => <td className="border border-border/70 px-2 py-1" {...props} />,
  hr: ({ node: _node, ...props }) => <hr className="my-3 border-border/70" {...props} />,
  img: ({ node: _node, ...props }) => (
    <img
      {...props}
      className="my-2 max-h-72 max-w-full rounded-md object-contain"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  ),
  input: ({ node: _node, ...props }) => (
    <input {...props} disabled className="mr-1 align-middle accent-primary" />
  ),
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
          'max-w-[85%] min-w-0 rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'whitespace-pre-wrap bg-primary text-primary-foreground'
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
          isUser ? (
            message.content
          ) : (
            <div className="min-w-0 break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                urlTransform={defaultUrlTransform}
                components={MARKDOWN_COMPONENTS}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )
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
