import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RecommendationMetadata } from '@/services/recommendation.service'

interface RecommendationMetadataProps {
  metadata: RecommendationMetadata
}

export function RecommendationMetadataPanel({ metadata }: RecommendationMetadataProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Análisis de tu colección</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Entradas analizadas</p>
          <p className="text-2xl font-bold">{metadata.analyzed_entries}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Rating promedio</p>
          <p className="text-2xl font-bold">{metadata.avg_rating.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tasa de completado</p>
          <p className="text-2xl font-bold">{metadata.completion_rate.toFixed(0)}%</p>
        </div>
        {metadata.favorite_genres.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Géneros favoritos</p>
            <div className="flex flex-wrap gap-1">
              {metadata.favorite_genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Modelo: <span className="font-medium">{metadata.model}</span>
          </p>
          {metadata.tokens_used != null && (
            <p className="text-xs text-muted-foreground">
              Tokens: <span className="font-medium">{metadata.tokens_used.toLocaleString()}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
