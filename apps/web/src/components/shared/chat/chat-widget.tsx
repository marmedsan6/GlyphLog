import { useEffect, useRef, useState } from 'react'
import { Bot, X } from 'lucide-react'
import { useAIChat } from '@/hooks/useAIChat'
import { Button } from '@/components/ui/button'
import { ChatInput } from '@/components/shared/chat/chat-input'
import { ChatMessage } from '@/components/shared/chat/chat-message'

/**
 * Widget flotante de GlyphAI (issue #46).
 *
 * Botón 💬 fijo en la esquina inferior derecha, visible en todas las páginas
 * protegidas (vive en AppLayout). El chat es EFÍMERO: el historial solo existe
 * en memoria mientras el widget está abierto — al recargar la página se pierde
 * (comportamiento esperado). No envía conversation_id al backend.
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, input, setInput, isStreaming, error, sendMessage } = useAIChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje cuando llegan deltas o nuevos mensajes.
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isOpen])

  return (
    <>
      <Button
        onClick={() => setIsOpen((open) => !open)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        aria-label={isOpen ? 'Cerrar chat GlyphAI' : 'Abrir chat GlyphAI'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-96 w-80 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">GlyphAI</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {isStreaming ? 'escribiendo…' : 'online'}
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && !error && (
              <p className="px-1 text-center text-xs text-muted-foreground">
                Pregúntame sobre tu colección de animes, mangas y juegos.
              </p>
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} isStreaming={isStreaming} />
            ))}
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-border p-3">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => void sendMessage()}
              disabled={isStreaming}
            />
          </div>
        </div>
      )}
    </>
  )
}
