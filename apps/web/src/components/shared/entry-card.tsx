import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCoverImageUrl } from '@/utils/cover-image-url'
import { getStatusLabel, getTypeLabel } from '@/utils/entry-labels'
import type { EntryListItem } from '@/types'

interface EntryCardProps {
  entry: EntryListItem
}

export function EntryCard({ entry }: EntryCardProps) {
  const coverUrl = getCoverImageUrl(entry.cover_image)
  const statusLabel = getStatusLabel(entry.type, entry.status)
  const typeLabel = getTypeLabel(entry.type)

  return (
    <Link to={`/entries/${entry.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
      <Card className="overflow-hidden h-full transition-shadow hover:shadow-md">
        <div className="relative aspect-[3/4] bg-muted">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Portada de ${entry.title}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="h-12 w-12" />
              <span className="text-xs">Sin imagen</span>
            </div>
          )}
        </div>
        <CardHeader className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary">{typeLabel}</Badge>
            <Badge>{statusLabel}</Badge>
          </div>
          <CardTitle className="mt-2 text-lg leading-tight">{entry.title}</CardTitle>
        </CardHeader>
        {entry.rating != null && (
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">
              Puntuación: <span className="font-medium text-foreground">{entry.rating}</span>
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
