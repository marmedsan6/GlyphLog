import { useEffect, useState } from 'react'
import { Plus, Send, Sparkles, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { EntryType } from '@/types'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  /** Función de generación de recomendaciones. Si no se pasa, el botón "+"
   *  no se muestra (p. ej. en el widget flotante, donde las recomendaciones
   *  no están disponibles). */
  onGenerateRecommendations?: (type: EntryType) => void
  /** Función de descubrimiento de YouTube desde el chat. */
  onGenerateYoutube?: (channelUrls: string[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'game', label: 'Videojuegos' },
]

const MAX_CHANNELS = 5

/**
 * Input del chat: Enter envía, Shift+Enter inserta salto de línea.
 * Incluye un botón "+" que abre un desplegable con funciones:
 * - Recomendaciones (elige tipo).
 * - Descubrimiento YouTube (pega URLs de canales).
 * Deshabilitado mientras GlyphAI está generando.
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  onGenerateRecommendations,
  onGenerateYoutube,
  disabled = false,
  placeholder = 'Pregunta a GlyphAI…',
  className,
}: ChatInputProps) {
  const [youtubeUrls, setYoutubeUrls] = useState('')
  const [youtubeOpen, setYoutubeOpen] = useState(false)

  // Radix Dialog (react-remove-scroll) no siempre limpia pointer-events del
  // <body> cuando el Dialog cierra durante un render batched (p. ej. cierre
  // del dialog + setIsGeneratingYoutube(true) en el mismo ciclo). Sin esto,
  // la página queda "pillada" — todos los clics son interceptados por <html>.
  useEffect(() => {
    if (!youtubeOpen && document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = ''
    }
  }, [youtubeOpen])

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!disabled && value.trim()) {
        onSend()
      }
    }
  }

  function parseChannelUrls(): string[] {
    return youtubeUrls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .slice(0, MAX_CHANNELS)
  }

  function handleYoutubeSubmit(): void {
    if (!onGenerateYoutube) return
    const urls = parseChannelUrls()
    if (urls.length === 0) return
    onGenerateYoutube(urls)
    setYoutubeUrls('')
    setYoutubeOpen(false)
  }

  const hasFunctions = onGenerateRecommendations || onGenerateYoutube

  return (
    <div className={cn('flex items-end gap-2', className)}>
      {hasFunctions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              className="h-9 w-9 shrink-0"
              aria-label="Abrir funciones"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" sideOffset={4}>
            <DropdownMenuLabel>Funciones</DropdownMenuLabel>
            {onGenerateRecommendations && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={disabled}>
                  <Sparkles />
                  Recomendaciones
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {TYPE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      disabled={disabled}
                      onSelect={() => onGenerateRecommendations(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {onGenerateYoutube && (
              <DropdownMenuItem
                disabled={disabled}
                onSelect={() => setYoutubeOpen(true)}
              >
                <Youtube />
                Descubrimiento YouTube
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={youtubeOpen} onOpenChange={setYoutubeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Canales de YouTube</DialogTitle>
            <DialogDescription>
              Pega las URLs de los canales que quieres analizar.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={youtubeUrls}
            onChange={(event) => setYoutubeUrls(event.target.value)}
            placeholder={`https://www.youtube.com/@TheAnimeMan\nhttps://www.youtube.com/@Gigguk`}
            rows={4}
            disabled={disabled}
            className="resize-none"
            aria-label="URLs de canales de YouTube"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Hasta {MAX_CHANNELS} canales, uno por línea
            </span>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleYoutubeSubmit}
              disabled={disabled || parseChannelUrls().length === 0}
            >
              Analizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="max-h-32 min-h-9 resize-none"
        aria-label="Mensaje para GlyphAI"
      />
      <Button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        size="icon"
        className="h-9 w-9 shrink-0"
        aria-label="Enviar mensaje"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
