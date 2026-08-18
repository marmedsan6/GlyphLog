import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Plus, Check, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { addSuggestionToCollection } from '@/services/youtube-discovery.service'
import type { YoutubeSuggestion } from '@/types/youtube-discovery'

interface ChatYoutubeSuggestionListProps {
  suggestions: YoutubeSuggestion[]
}

const TYPE_LABELS: Record<string, string> = {
  anime: 'Anime',
  manga: 'Manga',
  game: 'Juego',
}

/**
 * Lista compacta de tarjetas de sugerencias de YouTube renderizada dentro de
 * un mensaje del chat. Reutiliza la lógica de `YoutubeSuggestionCard`.
 */
export function ChatYoutubeSuggestionList({ suggestions }: ChatYoutubeSuggestionListProps) {
  return (
    <div className="mt-3 space-y-2">
      {suggestions.map((suggestion) => (
        <ChatYoutubeSuggestionCard
          key={`${suggestion.type}-${suggestion.title}-${suggestion.video_url}`}
          suggestion={suggestion}
        />
      ))}
    </div>
  )
}

function ChatYoutubeSuggestionCard({ suggestion }: { suggestion: YoutubeSuggestion }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAdded, setIsAdded] = useState(suggestion.in_collection)

  const addMutation = useMutation({
    mutationFn: () => addSuggestionToCollection(suggestion.title, suggestion.type),
    onSuccess: () => {
      setIsAdded(true)
      void queryClient.invalidateQueries({ queryKey: ['entries'] })
      toast({
        title: 'Añadido a tu lista',
        description: `${suggestion.title} se añadió como "Plan to Watch"`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo añadir a la lista',
        variant: 'destructive',
      })
    },
  })

  const opinionIcon = {
    positive: <ThumbsUp className="h-3.5 w-3.5 text-green-500" />,
    negative: <ThumbsDown className="h-3.5 w-3.5 text-red-500" />,
    mixed: <Minus className="h-3.5 w-3.5 text-yellow-500" />,
  }[suggestion.opinion]

  const opinionLabel = {
    positive: 'Recomendado',
    negative: 'No recomendado',
    mixed: 'Opinión mixta',
  }[suggestion.opinion]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {TYPE_LABELS[suggestion.type] ?? suggestion.type}
          </Badge>
          {suggestion.rating != null && (
            <Badge variant="outline" className="font-mono text-xs">
              {suggestion.rating}/10
            </Badge>
          )}
          {isAdded ? (
            <Badge variant="secondary" className="ml-auto">
              <Check className="mr-1 h-3 w-3" />
              En tu lista
            </Badge>
          ) : (
            <Badge className="ml-auto">Nuevo</Badge>
          )}
        </div>
        <CardTitle className="mt-1 text-base leading-tight">{suggestion.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-3 py-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {opinionIcon}
          <span>{opinionLabel}</span>
        </div>
        <p>
          <span className="font-medium">Mencionado por:</span> {suggestion.mentioned_by}
        </p>
        <p>
          <span className="font-medium">En:</span> {suggestion.video_title}
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2 p-3 pt-2">
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href={suggestion.video_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Ver vídeo
          </a>
        </Button>
        {!isAdded && (
          <Button
            size="sm"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {addMutation.isPending ? 'Añadiendo…' : 'Añadir a mi lista'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
