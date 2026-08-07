import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserStats } from "@/services/stats.service";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Film } from "lucide-react";

interface StatsByTypeChartProps {
  stats: UserStats;
}

export function StatsByTypeChart({ stats }: StatsByTypeChartProps) {
  const data = [
    {
      name: "Anime",
      count: stats.by_type.anime || 0,
      fill: "#8b5cf6",
    },
    {
      name: "Manga",
      count: stats.by_type.manga || 0,
      fill: "#ec4899",
    },
    {
      name: "Juegos",
      count: stats.by_type.game || 0,
      fill: "#10b981",
    },
  ];

  const hasData = data.some((item) => item.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          Distribución por Tipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-sm"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                className="text-sm"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
