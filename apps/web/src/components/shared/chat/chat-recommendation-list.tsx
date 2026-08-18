import { ExternalLink, ImageOff, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useCreateEntry } from '@/hooks/useCreateEntry'
import { getTypeLabel } from '@/utils/entry-labels'
import type { Recommendation } from '@/services/recommendation.service'

interface ChatRecommendationListProps {
  recommendations: Recommendation[]
}

/**
 * Lista de tarjetas de recomendaciones renderizada dentro de un mensaje del
 * chat. Versión compacta de `RecommendationCard` (página /recommendations),
 * con portada, % match, razón y botón "Añadir a Plan to Watch".
 */
export function ChatRecommendationList({ recommendations }: ChatRecommendationListProps) {
  return (
    <div className="mt-3 space-y-2">
      {recommendations.map((recommendation) => (
        <ChatRecommendationCard key={`${recommendation.type}-${recommendation.title}`} recommendation={recommendation} />
      ))}
    </div>
  )
}

function ChatRecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { toast } = useToast()
  const createEntry = useCreateEntry()
  const typeLabel = getTypeLabel(recommendation.type)

  function handleAddToPlanToWatch(): void {
    createEntry.mutate(
      {
        title: recommendation.title,
        type: recommendation.type,
        status: 'plan_to_watch',
        year: recommendation.year,
        cover_image: recommendation.cover_image_url,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Añadido a Plan to Watch',
            description: `"${recommendation.title}" se ha añadido a tu colección.`,
          })
        },
        onError: (error) => {
          toast({
            title: 'Error al añadir',
            description: error.message,
            variant: 'destructive',
          })
        },
      }
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex gap-3 p-3">
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
          {recommendation.cover_image_url ? (
            <img
              src={recommendation.cover_image_url}
              alt={`Portada de ${recommendation.title}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {typeLabel}
            </Badge>
            <span className="text-sm font-semibold">{recommendation.title}</span>
            {recommendation.year && (
              <span className="text-xs text-muted-foreground">{recommendation.year}</span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {recommendation.reason}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {recommendation.match_percentage}% match
            </Badge>
            {recommendation.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 px-3 pb-3 pt-0">
        <Button
          onClick={handleAddToPlanToWatch}
          disabled={createEntry.isPending}
          size="sm"
          variant="outline"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Añadir a Plan to Watch
        </Button>
        {recommendation.external_url && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="shrink-0"
            aria-label="Ver en sitio externo"
          >
            <a href={recommendation.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
