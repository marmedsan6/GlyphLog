/**
 * Página TEMPORAL de preview de estilos DiceBear para el avatar generado.
 *
 * Solo existe en desarrollo para elegir el estilo definitivo. Se eliminará
 * al fijar el estilo en el backend (app/services/profile_service.py).
 */
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AvatarStyle {
  name: string
  note: string
}

const STYLES: AvatarStyle[] = [
  { name: 'pixel-art', note: 'ACTUAL — pixel retro' },
  { name: 'lorelei', note: 'El más anime (ojos grandes y brillantes)' },
  { name: 'lorelei-neutral', note: 'Variante neutral de lorelei' },
  { name: 'miniavs', note: 'Chibi cute, minimalista' },
  { name: 'adventurer', note: 'Personaje estilo animación (cartoon)' },
  { name: 'adventurer-neutral', note: 'Variante neutral de adventurer' },
  { name: 'avataaars', note: 'Estilo plano moderno de apps' },
  { name: 'personas', note: 'Neón, futurista' },
  { name: 'notionists', note: 'Ilustración suave, estilo Notion' },
  { name: 'big-smile', note: 'Emoji grande, expresivo' },
  { name: 'micah', note: '3D suave' },
  { name: 'fun-emoji', note: 'Emoji divertido' },
]

const SEEDS = ['Mariobox', 'glyphlog']

export function AvatarPreviewPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Preview de estilos de avatar</h1>
          <p className="text-muted-foreground">
            Página temporal — elige el estilo y dime cuál te gusta para aplicarlo al avatar
            generado de GlyphLog.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/collection">Volver a la app</Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {STYLES.map((style) => (
          <Card key={style.name}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{style.name}</CardTitle>
              <CardDescription>{style.note}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {SEEDS.map((seed) => (
                  <div key={seed} className="flex flex-col items-center gap-1">
                    <img
                      src={`https://api.dicebear.com/9.x/${style.name}/svg?seed=${seed}`}
                      alt={`${style.name} (${seed})`}
                      className="h-24 w-24 rounded-full border border-border"
                    />
                    <span className="text-xs text-muted-foreground">{seed}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}