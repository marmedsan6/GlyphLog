/**
 * Página de estadísticas y métricas del usuario.
 */

import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useStats } from '@/hooks/useStats'
import { StatsOverview } from './stats-overview'
import { StatsByTypeChart } from './stats-by-type-chart'
import { StatsByStatusChart } from './stats-by-status-chart'
import { RatingDistributionChart } from './rating-distribution-chart'
import { EntriesTimelineChart } from './entries-timeline-chart'
import { ProgressSummary } from './progress-summary'

export function StatsPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading, isError, error } = useStats()

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">Error al cargar estadísticas</p>
            <p className="mt-2 text-sm text-muted-foreground">{error?.message}</p>
            <Button onClick={() => navigate('/collection')} variant="outline" className="mt-4">
              Volver a la colección
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const hasEntries = stats.total_entries > 0

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/collection')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Estadísticas</h1>
            <p className="mt-1 text-muted-foreground">
              Dashboard de tu colección
            </p>
          </div>
        </div>
      </div>

      {!hasEntries ? (
        <Card>
          <CardContent className="flex min-h-[400px] items-center justify-center p-8">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No hay entradas</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Añade entradas para ver estadísticas
              </p>
              <Button onClick={() => navigate('/collection')}>
                Ir a la colección
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <StatsOverview stats={stats} />
          <div className="grid gap-6 lg:grid-cols-2">
            <StatsByStatusChart stats={stats} />
            <StatsByTypeChart stats={stats} />
          </div>
          <RatingDistributionChart stats={stats} />
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <EntriesTimelineChart stats={stats} />
            <ProgressSummary stats={stats} />
          </div>
        </div>
      )}
    </div>
  )
}
