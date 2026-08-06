/**
 * Componente de preview de importación.
 * Muestra las entradas parseadas en una tabla editable con selección.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import type { ParsedEntry } from '@/services/import.service'
import { AlertTriangle, Upload } from 'lucide-react'

interface ImportPreviewProps {
  entries: ParsedEntry[]
  warnings: string[]
  onImport: (entries: ParsedEntry[]) => void
  onBack: () => void
  isImporting: boolean
}

export function ImportPreview({ entries, warnings, onImport, onBack, isImporting }: ImportPreviewProps) {
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(
    new Set(entries.map((_, i) => i))
  )

  function toggleEntry(index: number) {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedEntries(newSelected)
  }

  function toggleAll() {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set())
    } else {
      setSelectedEntries(new Set(entries.map((_, i) => i)))
    }
  }

  function handleImport() {
    const entriesToImport = entries.filter((_, i) => selectedEntries.has(i))
    onImport(entriesToImport)
  }

  function getConfidenceBadge(confidence: number) {
    if (confidence >= 0.9) {
      return <Badge variant="default" className="bg-green-600">Alta: {Math.round(confidence * 100)}%</Badge>
    }
    if (confidence >= 0.7) {
      return <Badge variant="secondary">Media: {Math.round(confidence * 100)}%</Badge>
    }
    return <Badge variant="destructive">Baja: {Math.round(confidence * 100)}%</Badge>
  }

  const selectedCount = selectedEntries.size

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Paso 3: Revisa y confirma</CardTitle>
          <CardDescription>
            Se encontraron {entries.length} entradas. Revisa y selecciona las que quieres importar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedEntries.size === entries.length}
                onCheckedChange={toggleAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Seleccionar todas ({entries.length})
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedCount} entrada{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {entries.map((entry, index) => (
              <Card
                key={index}
                className={`transition-colors ${
                  selectedEntries.has(index) ? 'border-primary' : 'opacity-60'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedEntries.has(index)}
                      onCheckedChange={() => toggleEntry(index)}
                      id={`entry-${index}`}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <label htmlFor={`entry-${index}`} className="font-semibold cursor-pointer">
                          {entry.title}
                        </label>
                        {getConfidenceBadge(entry.confidence)}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline">{entry.type}</Badge>
                        <Badge variant="outline">{entry.status}</Badge>
                        {entry.rating && <Badge variant="outline">⭐ {entry.rating}/10</Badge>}
                        {entry.year && <Badge variant="outline">{entry.year}</Badge>}
                        {entry.progress_total && (
                          <Badge variant="outline">
                            {entry.current_progress || 0} / {entry.progress_total}
                          </Badge>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={isImporting}>
              Atrás
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || isImporting}
              className="flex-1"
            >
              {isImporting ? (
                <>Importando...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {selectedCount} entrada{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
