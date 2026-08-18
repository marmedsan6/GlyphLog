import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EntryCard } from '@/components/shared/entry-card'
import { EntryFilters } from '@/components/shared/entry-filters'
import { EntryPagination } from '@/components/shared/entry-pagination'
import { EntrySortSelector } from '@/components/shared/entry-sort-selector'
import { ErrorState } from '@/components/shared/error-state'
import { useEntries } from '@/hooks/useEntries'

function EntryCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[3/4] animate-pulse bg-muted" />
      <CardContent className="space-y-3 p-3">
        <div className="h-4 w-16 animate-pulse rounded-[2px] bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded-[2px] bg-muted" />
      </CardContent>
    </Card>
  )
}

function CollectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <EntryCardSkeleton key={index} />
      ))}
    </div>
  )
}

function EmptyCollection() {
  return (
    <div className="rounded-[2px] border-2 border-dashed border-border p-8 text-center">
      <p className="mb-4 font-serif text-lg text-muted-foreground">
        Aún no tienes entradas en tu colección.
      </p>
      <Button asChild variant="ink">
        <Link to="/entries/new">Crear primera entrada</Link>
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
    search,
    sortBy,
    sortOrder,
    isLoading,
    isError,
    setPage,
    setType,
    setSearch,
    setSort,
    refetch,
  } = useEntries()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-foreground">
              Mi Colección
            </h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {total} {total === 1 ? 'entrada' : 'entradas'} archivadas
            </p>
          </div>
          <Button asChild variant="ink">
            <Link to="/entries/new">+ Nueva entrada</Link>
          </Button>
        </div>
        <div className="mt-4 border-b-2 border-border" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <EntryFilters activeType={type} onChange={setType} />
        <EntrySortSelector sortBy={sortBy} sortOrder={sortOrder} onSortChange={setSort} />
      </div>

      {search && (
        <div className="bg-accent/30 border-border/50 flex items-center justify-between rounded-lg border p-3 text-sm duration-200 animate-in fade-in-50">
          <p className="text-muted-foreground">
            Resultados de búsqueda para "
            <span className="font-semibold text-foreground">{search}</span>"
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch('')}
            className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar búsqueda
          </Button>
        </div>
      )}

      {isLoading && <CollectionSkeleton />}

      {isError && !isLoading && (
        <ErrorState
          message="No se pudo cargar tu colección. Inténtalo de nuevo."
          onRetry={refetch}
        />
      )}

      {!isLoading && !isError && entries.length === 0 && <EmptyCollection />}

      {!isLoading && !isError && entries.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
