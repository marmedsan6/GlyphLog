import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserStats } from '@/services/stats.service'
import { BookOpen, Film, Gamepad2, Clock } from 'lucide-react'

interface ProgressSummaryProps {
  stats: UserStats
}

export function ProgressSummary({ stats }: ProgressSummaryProps) {
  const progressData = [
    ['Episodios de Anime', stats.total_progress.episodes || 0, Film, 'text-purple-600'],
    ['Capítulos de Manga', stats.total_progress.chapters || 0, BookOpen, 'text-pink-600'],
    ['Horas de Juego', stats.total_progress.hours || 0, Clock, 'text-green-600'],
  ] as const
  const totalEntries = stats.total_entries || 1
  const completedEntries = stats.by_status.completed || 0
  const completionPercentage = (completedEntries / totalEntries) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" /> Resumen de Progreso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {progressData.map(([title, value, Icon, color]) => (
            <div key={title} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-medium">{title}</span>
              </div>
              <span className="text-lg font-bold">{value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tasa de Completado</span>
            <span className="text-sm font-bold">{completionPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${completionPercentage}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedEntries} completados</span>
            <span>{stats.total_entries} total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
