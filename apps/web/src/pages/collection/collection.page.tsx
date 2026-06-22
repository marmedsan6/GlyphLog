import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EntryCard } from '@/components/shared/entry-card'
import { EntryFilters } from '@/components/shared/entry-filters'
import { EntryPagination } from '@/components/shared/entry-pagination'
import { useEntries } from '@/hooks/useEntries'

function EntryCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[3/4] bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  )
}

function CollectionSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <EntryCardSkeleton key={index} />
      ))}
    </div>
  )
}

function EmptyCollection() {
  return (
    <div className="rounded-md border border-border p-8 text-center">
      <p className="text-muted-foreground mb-4">Aún no tienes entradas en tu colección.</p>
      <Button asChild>
        <Link to="/entries/new">Crear primera entrada</Link>
      </Button>
    </div>
  )
}

interface ErrorStateProps {
  onRetry: () => void
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8 text-center">
      <p className="text-destructive mb-4">
        No se pudo cargar tu colección. Inténtalo de nuevo.
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

export function CollectionPage() {
  const {
    entries,
    total,
    page,
    totalPages,
    type,
    isLoading,
    isError,
    setPage,
    setType,
    refetch,
  } = useEntries()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Colección</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'entrada' : 'entradas'}
          </p>
        </div>
        <Button asChild>
          <Link to="/entries/new">+ Nueva entrada</Link>
        </Button>
      </div>

      <EntryFilters activeType={type} onChange={setType} />

      {isLoading && <CollectionSkeleton />}

      {isError && !isLoading && <ErrorState onRetry={refetch} />}

      {!isLoading && !isError && entries.length === 0 && <EmptyCollection />}

      {!isLoading && !isError && entries.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
          <EntryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
