import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { useAIChat, type AIChatMessage } from '@/hooks/useAIChat'
import {
  CONVERSATIONS_QUERY_KEY,
  useConversation,
  useConversations,
  useDeleteConversation,
} from '@/hooks/useConversations'
import { ChatInput } from '@/components/shared/chat/chat-input'
import { ChatMessage } from '@/components/shared/chat/chat-message'
import { ConversationSidebar } from '@/pages/chat/conversation-sidebar'
import { WelcomeScreen } from '@/pages/chat/welcome-screen'

/**
 * Página /chat: experiencia completa de GlyphAI con historial persistente
 * (issue #47). Sidebar de conversaciones + área de chat con streaming.
 *
 * El widget flotante (#46) funciona de forma independiente con su propio
 * estado efímero — esta página usa conversaciones persistentes.
 */
export function ChatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isNewConversation, setIsNewConversation] = useState(true)
  const queryClient = useQueryClient()

  const { data: conversationsData, isLoading: isListLoading } = useConversations()
  const { data: conversationDetail } = useConversation(isNewConversation ? null : selectedId)
  const deleteMutation = useDeleteConversation()

  // Historial persistido de la conversación activa, como mensajes iniciales.
  const initialMessages = useMemo<AIChatMessage[]>(
    () =>
      conversationDetail?.messages.map((message) => ({
        id: message.id,
        role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: message.content,
      })) ?? [],
    [conversationDetail]
  )

  const chat = useAIChat(isNewConversation ? null : selectedId, initialMessages)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Refresca el listado cuando la conversación activa cambia (nueva creada,
  // mensaje enviado, etc.) para reflejar título/fecha/orden.
  useEffect(() => {
    if (chat.conversationId) {
      void queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] })
    }
  }, [chat.conversationId, queryClient])

  // Auto-scroll al último mensaje (deltas del streaming incluidos).
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [chat.messages])

  function handleNew(): void {
    setSelectedId(null)
    setIsNewConversation(true)
    chat.reset()
  }

  function handleSelect(id: string): void {
    setSelectedId(id)
    setIsNewConversation(false)
  }

  function handleDelete(id: string): void {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (id === selectedId) handleNew()
      },
    })
  }

  const activeTitle = isNewConversation
    ? 'Nueva conversación'
    : (conversationDetail?.title ?? 'Conversación')
  const showWelcome = chat.messages.length === 0 && !chat.error

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-card">
      <ConversationSidebar
        conversations={conversationsData?.conversations ?? []}
        isLoading={isListLoading}
        selectedId={isNewConversation ? null : selectedId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Bot className="h-4 w-4 text-primary" />
          <h1 className="truncate text-sm font-semibold">{activeTitle}</h1>
          <span className="ml-auto text-xs text-muted-foreground">
            {chat.isStreaming ? 'escribiendo…' : 'online'}
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {showWelcome ? (
            <WelcomeScreen onSuggestion={(text) => void chat.sendMessage(text)} />
          ) : (
            <>
              {chat.messages.map((message) => (
                <ChatMessage key={message.id} message={message} isStreaming={chat.isStreaming} />
              ))}
              {chat.error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {chat.error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border p-3">
          <ChatInput
            value={chat.input}
            onChange={chat.setInput}
            onSend={() => void chat.sendMessage()}
            disabled={chat.isStreaming}
            placeholder="Escribe a GlyphAI…"
          />
        </div>
      </section>
    </div>
  )
}
