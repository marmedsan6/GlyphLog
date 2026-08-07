/**
 * Card para mostrar una sugerencia extraída de YouTube.
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Plus, Check, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import type { YoutubeSuggestion } from '@/types/youtube-discovery'
import { addSuggestionToCollection } from '@/services/youtube-discovery.service'
import { useToast } from '@/hooks/use-toast'

interface YoutubeSuggestionCardProps {
  suggestion: YoutubeSuggestion
}

export function YoutubeSuggestionCard({ suggestion }: YoutubeSuggestionCardProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAdded, setIsAdded] = useState(suggestion.in_collection)

  const addMutation = useMutation({
    mutationFn: () => addSuggestionToCollection(suggestion.title, suggestion.type),
    onSuccess: () => {
      setIsAdded(true)
      queryClient.invalidateQueries({ queryKey: ['entries'] })
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

  const getOpinionIcon = () => {
    switch (suggestion.opinion) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-500" />
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-500" />
      case 'mixed':
        return <Minus className="h-4 w-4 text-yellow-500" />
    }
  }

  const getOpinionLabel = () => {
    switch (suggestion.opinion) {
      case 'positive':
        return 'Recomendado'
      case 'negative':
        return 'No recomendado'
      case 'mixed':
        return 'Opinión mixta'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'anime':
        return 'Anime'
      case 'manga':
        return 'Manga'
      case 'game':
        return 'Juego'
      default:
        return type
    }
  }

  const videoUrlWithTimestamp = suggestion.timestamp
    ? `${suggestion.video_url}&t=${suggestion.timestamp.replace(':', 'm')}s`
    : suggestion.video_url

  return (
    <Card className="relative">
      {/* Badge de estado */}
      <div className="absolute top-4 right-4">
        {isAdded ? (
          <Badge variant="secondary">
            <Check className="h-3 w-3 mr-1" />
            En tu lista
          </Badge>
        ) : (
          <Badge>Nuevo</Badge>
        )}
      </div>

      <CardHeader className="pr-24">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{getTypeLabel(suggestion.type)}</Badge>
          {suggestion.rating && (
            <Badge variant="outline" className="font-mono">
              {suggestion.rating}/10
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">{suggestion.title}</CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 mt-1">
            {getOpinionIcon()}
            <span>{getOpinionLabel()}</span>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Portada si está disponible */}
        {suggestion.cover_image_url && (
          <div className="w-full h-48 rounded-md overflow-hidden bg-muted">
            <img
              src={suggestion.cover_image_url}
              alt={suggestion.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Info del vídeo */}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium">Mencionado por:</span> {suggestion.mentioned_by}
          </p>
          <p>
            <span className="font-medium">En:</span> {suggestion.video_title}
            {suggestion.timestamp && (
              <span className="ml-1 font-mono">({suggestion.timestamp})</span>
            )}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a href={videoUrlWithTimestamp} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver vídeo
            </a>
          </Button>

          {!isAdded && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {addMutation.isPending ? 'Añadiendo...' : 'Añadir a mi lista'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
