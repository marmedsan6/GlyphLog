import { History, RotateCcw, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProgressHistory } from '@/hooks/useProgressHistory'
import {
  formatAbsoluteDate,
  formatDelta,
  formatEventDescription,
  formatRelativeDate,
} from '@/utils/progress-history-labels'
import type { ProgressHistoryEvent } from '@/services/entry.service'

export interface ProgressTimelineProps {
  entryId: string
  hasHistory?: boolean
}

export function ProgressTimeline({ entryId, hasHistory = true }: ProgressTimelineProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useProgressHistory(entryId, hasHistory)

  if (!hasHistory) {
    return null
  }

  const events: ProgressHistoryEvent[] = data?.pages.flatMap((page) => page.events) ?? []

  return (
    <Card data-testid="progress-timeline-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-muted-foreground" />
          Historial de progreso
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4 py-2" data-testid="timeline-skeleton">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-12 w-full animate-pulse rounded bg-muted" />
            <div className="h-12 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center text-sm text-destructive">
            <p>{error?.message || 'Error al cargar el historial de progreso.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sin historial de progreso registrado.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="relative my-2 ml-3 space-y-6 border-l-2 border-border pl-6">
              {events.map((event) => {
                const deltaInfo = formatDelta(event.delta, event.event_type)
                const isReset = event.event_type === 'reset'
                const isPositive = (event.delta ?? 0) > 0
                const isNegative = (event.delta ?? 0) < 0

                return (
                  <div
                    key={event.id}
                    className="relative group"
                    data-testid={`timeline-event-${event.id}`}
                  >
                    {/* Node icon on timeline line */}
                    <div
                      className={`absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs transition-colors ${
                        isReset
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : isPositive
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                            : isNegative
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
                              : 'border-border'
                      }`}
                    >
                      {isReset ? (
                        <RotateCcw className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      ) : isPositive ? (
                        <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      ) : isNegative ? (
                        <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {formatEventDescription(event)}
                          </span>
                          {deltaInfo.text && (
                            <span className={`text-xs ${deltaInfo.className}`}>
                              ({deltaInfo.text})
                            </span>
                          )}
                        </div>

                        <span
                          title={formatAbsoluteDate(event.recorded_at)}
                          className="cursor-help text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {formatRelativeDate(event.recorded_at)}
                        </span>
                      </div>

                      {event.note && (
                        <div className="mt-1 rounded-md bg-muted/50 p-2.5 text-xs italic text-muted-foreground">
                          "{event.note}"
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-4 w-full"
                data-testid="load-more-events-button"
              >
                {isFetchingNextPage ? 'Cargando más...' : 'Cargar más eventos'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
