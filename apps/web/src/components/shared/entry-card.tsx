import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { getCoverImageUrl } from '@/utils/cover-image-url'
import { getTypeLabel } from '@/utils/entry-labels'
import type { EntryListItem } from '@/types'
import { QuickProgressButton } from './quick-progress-button'
import { InlineProgressEditor } from './inline-progress-editor'
import { StatusStamp } from './status-stamp'
import { CassetteProgress } from './cassette-progress'

interface EntryCardProps {
  entry: EntryListItem
}

export function EntryCard({ entry }: EntryCardProps) {
  const coverUrl = getCoverImageUrl(entry.cover_image)
  const typeLabel = getTypeLabel(entry.type)

  return (
    <Link
      to={`/entries/${entry.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="relative h-full overflow-visible border-border transition-shadow hover:shadow-offset-lg">
        {/* Cinta adhesiva decorativa sobre la ficha */}
        <div className="card-tape" aria-hidden="true" />

        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {/* Fondo degradado de respaldo */}
          <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-400 dark:from-stone-700 dark:to-stone-900" />

          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Portada de ${entry.title}`}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="h-12 w-12" />
              <span className="font-mono text-xs uppercase tracking-wider">Sin imagen</span>
            </div>
          )}

          {/* Degradado inferior para legibilidad del título */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />

          {/* Sello de estado */}
          <StatusStamp type={entry.type} status={entry.status} className="absolute top-3 right-3" />

          {/* Título sobre la portada */}
          <h3 className="absolute inset-x-3 bottom-3 line-clamp-2 font-serif text-lg font-semibold leading-tight text-white drop-shadow">
            {entry.title}
          </h3>

          <QuickProgressButton entry={entry} />
        </div>

        <div className="space-y-3 p-3">
          <div className="flex items-center justify-between">
            <Badge variant="stamp" className="px-1.5 py-0 text-[10px]">
              {typeLabel}
            </Badge>
            {entry.rating != null && (
              <span className="font-mono text-xs text-muted-foreground">
                ★ {entry.rating}
              </span>
            )}
          </div>

          {(entry.progress_unit || entry.current_progress != null) && (
            <InlineProgressEditor
              entry={entry}
              renderDisplay={(openEditor, displayText) => (
                <button
                  type="button"
                  onClick={openEditor}
                  className="w-full text-left"
                  aria-label={`Editar progreso de ${entry.title}: ${displayText}`}
                >
                  <CassetteProgress
                    current={entry.current_progress}
                    total={entry.progress_total}
                    unit={entry.progress_unit}
                  />
                </button>
              )}
            />
          )}
        </div>
      </Card>
    </Link>
  )
}
