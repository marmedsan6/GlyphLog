import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserStats } from '@/services/stats.service'
import { BookOpen, Film, Gamepad2, Star, CheckCircle2 } from 'lucide-react'

interface StatsOverviewProps {
  stats: UserStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    ['Total de Entradas', stats.total_entries, BookOpen, 'text-blue-600', 'bg-blue-100'],
    ['Anime', stats.by_type.anime || 0, Film, 'text-purple-600', 'bg-purple-100'],
    ['Manga', stats.by_type.manga || 0, BookOpen, 'text-pink-600', 'bg-pink-100'],
    ['Juegos', stats.by_type.game || 0, Gamepad2, 'text-green-600', 'bg-green-100'],
    ['Rating Promedio', stats.avg_rating.toFixed(1), Star, 'text-yellow-600', 'bg-yellow-100'],
    ['Completados', stats.by_status.completed || 0, CheckCircle2, 'text-emerald-600', 'bg-emerald-100'],
  ] as const

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map(([title, value, Icon, color, bgColor]) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className={`rounded-full p-2 ${bgColor}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
