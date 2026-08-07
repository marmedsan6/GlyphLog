import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserStats } from '@/services/stats.service'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Star } from 'lucide-react'

export function RatingDistributionChart({ stats }: { stats: UserStats }) {
  const data = Object.entries(stats.rating_distribution).map(([rating, count]) => ({ rating, count }))
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" />Distribución de Ratings</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">No hay datos disponibles</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
