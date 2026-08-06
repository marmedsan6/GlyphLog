/**
 * Página de importación inteligente de listas con Claude.
 * Wizard de 3 pasos: seleccionar fuente, pegar contenido, preview y confirmar.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useParseImport } from '@/hooks/useParseImport'
import { useExecuteImport } from '@/hooks/useExecuteImport'
import { useToast } from '@/hooks/use-toast'
import { getApiErrorMessage } from '@/utils/error'
import { ImportPreview } from './import-preview'
import type { ImportSource, ParsedEntry } from '@/services/import.service'
import { ArrowLeft, FileText, Upload } from 'lucide-react'

export function ImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [source, setSource] = useState<ImportSource>('text')
  const [content, setContent] = useState('')
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const { mutate: parse, isPending: isParsing } = useParseImport()
  const { mutate: execute, isPending: isExecuting } = useExecuteImport()
  const { toast } = useToast()
  const navigate = useNavigate()

  const sourceOptions: Array<{ value: ImportSource; label: string; description: string }> = [
    { value: 'text', label: 'Texto libre', description: 'Pega tu lista en cualquier formato' },
    { value: 'mal', label: 'MyAnimeList', description: 'Export XML o HTML copiado de la web' },
    { value: 'anilist', label: 'AniList', description: 'Export JSON desde configuración' },
    { value: 'kitsu', label: 'Kitsu', description: 'Export JSON' },
    { value: 'steam', label: 'Steam', description: 'Lista de juegos copiada de la biblioteca' },
  ]

  function handleParse() {
    if (content.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Contenido insuficiente',
        description: 'Pega al menos 10 caracteres de tu lista',
      })
      return
    }

    parse(
      { source, content },
      {
        onSuccess: (data) => {
          setParsedEntries(data.entries)
          setWarnings(data.warnings)
          setStep(3)
          toast({
            title: 'Lista parseada',
            description: `Se encontraron ${data.entries.length} entradas`,
          })
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error al parsear',
            description: getApiErrorMessage(error),
          })
        },
      }
    )
  }

  function handleExecuteImport(entries: ParsedEntry[]) {
    execute(
      { entries },
      {
        onSuccess: (data) => {
          toast({
            title: 'Importación completada',
            description: `${data.created} creadas, ${data.skipped} omitidas, ${data.errors.length} errores`,
          })
          navigate('/collection')
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error al importar',
            description: getApiErrorMessage(error),
          })
        },
      }
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/collection')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la colección
        </Button>
        <h1 className="text-3xl font-bold">Importar lista</h1>
        <p className="text-muted-foreground mt-2">
          Importa tu colección desde MyAnimeList, AniList, Steam o cualquier lista de texto
        </p>
      </div>

      {/* Step 1: Seleccionar fuente */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 1: Selecciona la fuente</CardTitle>
            <CardDescription>¿De dónde proviene tu lista?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {sourceOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    source === option.value ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => setSource(option.value)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{option.label}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Button onClick={() => setStep(2)} className="w-full">
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pegar contenido */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 2: Pega tu lista</CardTitle>
            <CardDescription>
              Claude analizará el contenido y extraerá las entradas automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Contenido de la lista</Label>
              <Textarea
                id="content"
                placeholder="Pega aquí tu lista de anime/manga/juegos..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                💡 Esto usa Claude/Bedrock y consume aproximadamente 5-15k tokens por cada 100 entradas
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleParse} disabled={isParsing} className="flex-1">
                {isParsing ? (
                  <>Analizando... (puede tardar 10-30 segundos)</>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Parsear lista
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview y confirmación */}
      {step === 3 && (
        <ImportPreview
          entries={parsedEntries}
          warnings={warnings}
          onImport={handleExecuteImport}
          onBack={() => setStep(2)}
          isImporting={isExecuting}
        />
      )}
    </div>
  )
}
