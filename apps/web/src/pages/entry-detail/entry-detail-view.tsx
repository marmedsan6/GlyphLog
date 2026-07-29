import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCoverImageUrl } from '@/utils/cover-image-url'
import { getStatusLabel, getTypeLabel } from '@/utils/entry-labels'
import { formatProgress } from '@/utils/progress-labels'
import { ProgressTimeline } from '@/components/shared/progress-timeline'
import type { EntryResponse } from '@/types'

export interface EntryDetailViewProps {
  entry: EntryResponse
  onUpdateProgressClick?: () => void
}

export function EntryDetailView({ entry, onUpdateProgressClick }: EntryDetailViewProps) {
  const coverUrl = getCoverImageUrl(entry.cover_image)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-[360px_1fr]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={`Portada de ${entry.title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <span className="text-xs">Sin imagen</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{entry.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {getTypeLabel(entry.type)} · {getStatusLabel(entry.type, entry.status)}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Puntuación</p>
                  <p className="text-lg font-medium">{entry.rating != null ? entry.rating : '—'}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Año</p>
                  <p className="text-lg font-medium">{entry.year != null ? entry.year : '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Progreso</p>
                  <p className="text-sm font-medium">
                    {formatProgress(
                      entry.current_progress,
                      entry.progress_total,
                      entry.progress_unit
                    )}
                  </p>
                </div>
                {entry.progress_unit && onUpdateProgressClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUpdateProgressClick}
                    data-testid="update-progress-button"
                  >
                    Actualizar
                  </Button>
                )}
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="mb-1 text-xs text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap text-sm">{entry.notes ?? 'Sin notas'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {entry.has_history && <ProgressTimeline entryId={entry.id} hasHistory={entry.has_history} />}
    </div>
  )
}

