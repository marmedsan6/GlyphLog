import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserStats } from '@/services/stats.service'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ListChecks } from 'lucide-react'

const COLORS: Record<string, string> = {
  completed: '#10b981',
  watching: '#3b82f6',
  reading: '#3b82f6',
  playing: '#3b82f6',
  plan_to_watch: '#f59e0b',
  plan_to_read: '#f59e0b',
  plan_to_play: '#f59e0b',
  on_hold: '#8b5cf6',
  dropped: '#ef4444',
}

const LABELS: Record<string, string> = {
  completed: 'Completado',
  watching: 'Viendo',
  reading: 'Leyendo',
  playing: 'Jugando',
  plan_to_watch: 'Planeado',
  plan_to_read: 'Planeado',
  plan_to_play: 'Planeado',
  on_hold: 'En pausa',
  dropped: 'Abandonado',
}

export function StatsByStatusChart({ stats }: { stats: UserStats }) {
  const data = Object.entries(stats.by_status)
    .map(([status, value]) => ({
      name: LABELS[status] ?? status,
      value,
      fill: COLORS[status] ?? '#6b7280',
    }))
    .filter((item) => item.value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Distribución por Estado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
