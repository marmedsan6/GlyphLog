/**
 * Página de descubrimiento desde YouTube.
 *
 * Permite al usuario añadir canales de YouTube y analizar sus vídeos
 * para descubrir nuevos animes, mangas y juegos recomendados.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Youtube, Info } from 'lucide-react'
import { YoutubeChannelManager } from '@/components/youtube/youtube-channel-manager'
import { YoutubeSuggestionCard } from '@/components/youtube/youtube-suggestion-card'
import { AnalysisMetadataPanel } from '@/components/youtube/analysis-metadata'
import { useYoutubeChannels } from '@/hooks/useYoutubeChannels'
import { useAnalyzeChannels } from '@/hooks/useAnalyzeChannels'

export function YoutubeDiscoveryPage() {
  const { channels } = useYoutubeChannels()
  const analyzeMutation = useAnalyzeChannels()
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  const handleAnalyze = () => {
    if (channels.length === 0) {
      return
    }

    setHasAnalyzed(true)
    analyzeMutation.mutate(channels)
  }

  const data = analyzeMutation.data
  const newSuggestions = data?.suggestions.filter((s) => !s.in_collection) || []
  const inCollectionSuggestions = data?.suggestions.filter((s) => s.in_collection) || []

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Youtube className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Descubre desde YouTube</h1>
        </div>
        <p className="text-muted-foreground">
          Analiza tus canales favoritos de anime/manga/gaming y descubre nuevo contenido
          recomendado por los creadores que sigues.
        </p>
      </div>

      {/* Disclaimer */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          El análisis usa YouTube Data API y Claude (Bedrock) para extraer menciones de los
          vídeos. Puede tardar 60-90 segundos y consume ~40-60k tokens por análisis.
        </AlertDescription>
      </Alert>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Gestión de canales */}
        <div className="lg:col-span-1 space-y-6">
          <YoutubeChannelManager />

          {/* Botón de análisis */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleAnalyze}
            disabled={channels.length === 0 || analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analizando {channels.length} {channels.length === 1 ? 'canal' : 'canales'}...
              </>
            ) : (
              <>
                <Youtube className="h-5 w-5 mr-2" />
                Analizar mis canales
              </>
            )}
          </Button>

          {/* Metadata del análisis */}
          {data?.metadata && <AnalysisMetadataPanel metadata={data.metadata} />}
        </div>

        {/* Columna derecha: Resultados */}
        <div className="lg:col-span-2">
          {/* Estados: loading, error, success, empty */}
          {analyzeMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analizando vídeos...</h3>
              <p className="text-muted-foreground max-w-md">
                Estamos procesando los transcripts de los últimos vídeos de tus canales.
                Esto puede tardar 1-2 minutos.
              </p>
            </div>
          )}

          {analyzeMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {analyzeMutation.error instanceof Error
                  ? analyzeMutation.error.message
                  : 'Error al analizar canales. Verifica las URLs e inténtalo de nuevo.'}
              </AlertDescription>
            </Alert>
          )}

          {data && !analyzeMutation.isPending && (
            <>
              {data.suggestions.length === 0 ? (
                <div className="text-center py-16">
                  <Youtube className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No se encontraron sugerencias</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No se encontraron menciones de anime/manga/juegos en los vídeos analizados.
                    Intenta con otros canales.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Nuevas sugerencias */}
                  {newSuggestions.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4">
                        Nuevas sugerencias ({newSuggestions.length})
                      </h2>
                      <div className="grid grid-cols-1 gap-4">
                        {newSuggestions.map((suggestion, index) => (
                          <YoutubeSuggestionCard key={index} suggestion={suggestion} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ya en tu lista */}
                  {inCollectionSuggestions.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4">
                        Ya en tu lista ({inCollectionSuggestions.length})
                      </h2>
                      <div className="grid grid-cols-1 gap-4">
                        {inCollectionSuggestions.map((suggestion, index) => (
                          <YoutubeSuggestionCard key={index} suggestion={suggestion} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Empty state inicial */}
          {!hasAnalyzed && !analyzeMutation.isPending && (
            <div className="text-center py-16">
              <Youtube className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Añade tus canales favoritos</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Añade hasta 5 canales de YouTube y analiza sus últimos vídeos para descubrir
                nuevo contenido recomendado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
