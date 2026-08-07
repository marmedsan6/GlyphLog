import { Bot } from 'lucide-react'

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void
}

const SUGGESTIONS = [
  '¿Qué anime me recomiendas según mi colección?',
  '¿Cuántos animes tengo completados?',
  '¿Qué manga debería leer a continuación?',
  '¿Qué juego encaja con mis gustos?',
]

/**
 * Pantalla de bienvenida de /chat cuando no hay conversación activa:
 * 3-4 sugerencias de preguntas clickeables que inician el chat.
 */
export function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Habla con GlyphAI</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Tu asistente personal de anime, manga y videojuegos. Conoce tu colección
          y responde en streaming.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestion(suggestion)}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
