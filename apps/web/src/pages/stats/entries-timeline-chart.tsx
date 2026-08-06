import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserStats } from "@/services/stats.service";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

interface EntriesTimelineChartProps {
  stats: UserStats;
}

export function EntriesTimelineChart({ stats }: EntriesTimelineChartProps) {
  // Transform timeline data into chart format
  const data = (stats.timeline || []).map((entry) => ({
    month: entry.month,
    anime: entry.byType?.anime || 0,
    manga: entry.byType?.manga || 0,
    game: entry.byType?.game || 0,
    total: entry.count || 0,
  }));

  const hasData = data.length > 0 && data.some((item) => item.total > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Entradas por Mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-sm"
                tick={{ fill: "hsl(var(--foreground))" }}
                tickFormatter={(value) => {
                  // Format YYYY-MM to MMM YY
                  const [year, month] = value.split("-");
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleDateString("es-ES", {
                    month: "short",
                    year: "2-digit",
                  });
                }}
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
                labelFormatter={(value) => {
                  const [year, month] = value.split("-");
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  });
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="anime"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Anime"
                dot={{ fill: "#8b5cf6" }}
              />
              <Line
                type="monotone"
                dataKey="manga"
                stroke="#ec4899"
                strokeWidth={2}
                name="Manga"
                dot={{ fill: "#ec4899" }}
              />
              <Line
                type="monotone"
                dataKey="game"
                stroke="#10b981"
                strokeWidth={2}
                name="Juegos"
                dot={{ fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
