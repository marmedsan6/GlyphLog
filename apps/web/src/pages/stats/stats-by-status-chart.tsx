import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserStats } from "@/services/stats.service";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ListChecks } from "lucide-react";

interface StatsByStatusChartProps {
  stats: UserStats;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  "in-progress": "#3b82f6",
  planned: "#f59e0b",
  "on-hold": "#8b5cf6",
  dropped: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  "in-progress": "En Progreso",
  planned: "Planeado",
  "on-hold": "En Pausa",
  dropped: "Abandonado",
};

export function StatsByStatusChart({ stats }: StatsByStatusChartProps) {
  const data = Object.entries(stats.byStatus || {})
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      fill: STATUS_COLORS[status] || "#6b7280",
    }))
    .filter((item) => item.value > 0);

  const hasData = data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Distribución por Estado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
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
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
