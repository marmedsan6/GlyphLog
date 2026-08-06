/**
 * Componente para gestionar la lista de canales de YouTube guardados.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'
import { useYoutubeChannels } from '@/hooks/useYoutubeChannels'

export function YoutubeChannelManager() {
  const { channels, addChannel, removeChannel, canAddMore, maxChannels } = useYoutubeChannels()
  const [newChannelUrl, setNewChannelUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAddChannel = () => {
    setError(null)

    if (!newChannelUrl.trim()) {
      setError('Ingresa una URL de canal')
      return
    }

    // Validación básica de URL de YouTube
    if (!newChannelUrl.includes('youtube.com')) {
      setError('Ingresa una URL válida de YouTube')
      return
    }

    try {
      addChannel(newChannelUrl.trim())
      setNewChannelUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al añadir canal')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddChannel()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis canales</CardTitle>
        <CardDescription>
          Añade hasta {maxChannels} canales de YouTube para analizar sus vídeos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input para añadir nuevo canal */}
        <div className="space-y-2">
          <Label htmlFor="channel-url">URL del canal</Label>
          <div className="flex gap-2">
            <Input
              id="channel-url"
              type="url"
              placeholder="https://www.youtube.com/@TheAnimeMan"
              value={newChannelUrl}
              onChange={(e) => setNewChannelUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!canAddMore}
            />
            <Button onClick={handleAddChannel} disabled={!canAddMore}>
              Añadir
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!canAddMore && (
            <p className="text-sm text-muted-foreground">
              Máximo de {maxChannels} canales alcanzado
            </p>
          )}
        </div>

        {/* Lista de canales guardados */}
        {channels.length > 0 ? (
          <div className="space-y-2">
            <Label>Canales guardados ({channels.length}/{maxChannels})</Label>
            <div className="space-y-2">
              {channels.map((channel) => (
                <div
                  key={channel}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm truncate flex-1">{channel}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChannel(channel)}
                    className="ml-2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Eliminar canal</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No has añadido ningún canal todavía.</p>
            <p className="text-sm mt-1">
              Añade tus canales favoritos de anime/manga/gaming para empezar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
