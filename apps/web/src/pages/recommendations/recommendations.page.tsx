/**
 * Página de recomendaciones personalizadas generadas con Claude.
 * Analiza la colección del usuario y sugiere nuevas entradas basadas en sus gustos.
 */

import { useState } from 'react'
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useGenerateRecommendations } from '@/hooks/useGenerateRecommendations'
import { useToast } from '@/hooks/use-toast'
import { getApiErrorMessage } from '@/utils/api-errors'
import { RecommendationCard } from './recommendation-card'
import { RecommendationMetadataPanel } from './recommendation-metadata'
import type { EntryType } from '@/types'
import type { GenerateRecommendationsResponse } from '@/services/recommendation.service'

export function RecommendationsPage() {
  const [filterType, setFilterType] = useState<EntryType | 'all'>('all')
  const [limit, setLimit] = useState<number>(10)
  const [result, setResult] = useState<GenerateRecommendationsResponse | null>(null)

  const { mutate: generate, isPending } = useGenerateRecommendations()
  const { toast } = useToast()
  const navigate = useNavigate()

  function handleGenerate(): void {
    generate(
      {
        type: filterType === 'all' ? undefined : filterType,
        limit,
      },
      {
        onSuccess: (data) => {
          setResult(data)
          toast({
            title: 'Recomendaciones generadas',
            description: `Se generaron ${data.recommendations.length} recomendaciones personalizadas.`,
          })
        },
        onError: (error) => {
          const message = getApiErrorMessage(error)
          if (message.includes('menos de 5 entradas')) {
            toast({
              title: 'Colección insuficiente',
              description: 'Añade al menos 5 entradas a tu colección para obtener recomendaciones personalizadas.',
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'Error al generar recomendaciones',
              description: message,
              variant: 'destructive',
            })
          }
        },
      }
    )
  }

  const hasMinimumEntries = result ? result.metadata.analyzed_entries >= 5 : true

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/collection')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la colección
        </Button>
        <h1 className="text-3xl font-bold">Recomendaciones personalizadas</h1>
        <p className="mt-2 text-muted-foreground">
          Claude analiza tu colección y te sugiere nuevos animes, mangas y juegos basados en tus gustos.
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Este sistema usa Claude Sonnet 4.5 en AWS Bedrock y consume aproximadamente 30-50k tokens por generación.
          El análisis puede tardar entre 30-60 segundos.
        </AlertDescription>
      </Alert>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Generar recomendaciones</CardTitle>
          <CardDescription>
            Configura los filtros y genera tus recomendaciones personalizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de contenido</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filterType === 'all' ? 'Todos' : filterType === 'anime' ? 'Anime' : filterType === 'manga' ? 'Manga' : 'Juegos'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    Todos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('anime')}>
                    Anime
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('manga')}>
                    Manga
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('game')}>
                    Juegos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2">
              <Label>Número de recomendaciones</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {limit} recomendaciones
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => setLimit(5)}>
                    5 recomendaciones
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLimit(10)}>
                    10 recomendaciones
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLimit(20)}>
                    20 recomendaciones
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={isPending} className="w-full sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" />
            {isPending ? 'Claude está analizando tu colección...' : 'Generar recomendaciones'}
          </Button>
        </CardContent>
      </Card>

      {!hasMinimumEntries && result && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu colección tiene menos de 5 entradas. Añade más contenido para obtener recomendaciones más precisas.
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {result.recommendations.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[200px] items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      No se encontraron recomendaciones con los filtros seleccionados.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Intenta cambiar los filtros o añade más entradas a tu colección.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {result.recommendations.map((recommendation, index) => (
                  <RecommendationCard key={`${recommendation.title}-${index}`} recommendation={recommendation} />
                ))}
              </div>
            )}
          </div>
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <RecommendationMetadataPanel metadata={result.metadata} />
          </aside>
        </div>
      )}

      {!result && !isPending && (
        <Card>
          <CardContent className="flex min-h-[400px] items-center justify-center p-8">
            <div className="text-center">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Genera tu primera recomendación personalizada</h3>
              <p className="text-sm text-muted-foreground">
                Configura los filtros arriba y haz clic en "Generar recomendaciones" para comenzar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
