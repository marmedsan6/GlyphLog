import { ExternalLink, ImageOff, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useCreateEntry } from '@/hooks/useCreateEntry'
import { getTypeLabel } from '@/utils/entry-labels'
import type { Recommendation } from '@/services/recommendation.service'

interface RecommendationCardProps {
  recommendation: Recommendation
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { toast } = useToast()
  const createEntry = useCreateEntry()
  const typeLabel = getTypeLabel(recommendation.type)

  function getMatchBadgeVariant(percentage: number): 'default' | 'secondary' | 'destructive' {
    if (percentage >= 80) return 'default'
    if (percentage >= 65) return 'secondary'
    return 'destructive'
  }

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

  const matchVariant = getMatchBadgeVariant(recommendation.match_percentage)

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[3/4] bg-muted">
        {recommendation.cover_image_url ? (
          <img
            src={recommendation.cover_image_url}
            alt={`Portada de ${recommendation.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-12 w-12" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={matchVariant} className="font-semibold">
            {recommendation.match_percentage}% match
          </Badge>
        </div>
      </div>
      <CardHeader className="flex-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">{typeLabel}</Badge>
          {recommendation.year && (
            <span className="text-xs text-muted-foreground">{recommendation.year}</span>
          )}
        </div>
        <CardTitle className="mt-2 text-lg leading-tight">{recommendation.title}</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">{recommendation.reason}</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {recommendation.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recommendation.genres.map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        )}
        {recommendation.similar_to.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Similar a: <span className="font-medium">{recommendation.similar_to.join(', ')}</span>
          </p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 p-4 pt-0">
        <Button
          onClick={handleAddToPlanToWatch}
          disabled={createEntry.isPending}
          className="flex-1"
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          Añadir a Plan to Watch
        </Button>
        {recommendation.external_url && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0"
            aria-label="Ver en sitio externo"
          >
            <a href={recommendation.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
