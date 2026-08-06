/**
 * Hooks de conversaciones persistentes de GlyphAI (issue #47).
 * TanStack Query con invalidación de la query key raíz tras mutaciones.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteConversation,
  getConversation,
  getConversations,
  type ConversationResponse,
  type PaginatedConversationsResponse,
} from '@/services/ai.service'

export const CONVERSATIONS_QUERY_KEY = 'conversations'

export function useConversations() {
  return useQuery<PaginatedConversationsResponse, Error>({
    queryKey: [CONVERSATIONS_QUERY_KEY],
    queryFn: () => getConversations(1, 15),
    staleTime: 30 * 1000,
  })
}

export function useConversation(id: string | null) {
  return useQuery<ConversationResponse, Error>({
    queryKey: [CONVERSATIONS_QUERY_KEY, id],
    queryFn: () => getConversation(id as string),
    enabled: id !== null,
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (conversationId) => deleteConversation(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] })
    },
  })
}
