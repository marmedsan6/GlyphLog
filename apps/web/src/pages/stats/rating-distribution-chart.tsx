import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserStats } from "@/services/stats.service";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Star } from "lucide-react";

interface RatingDistributionChartProps {
  stats: UserStats;
}

export function RatingDistributionChart({ stats }: RatingDistributionChartProps) {
  // Create data for ratings 1-10
  const data = Array.from({ length: 10 }, (_, i) => {
    const rating = i + 1;
    const count = stats.ratingDistribution?.[rating] || 0;
    return {
      rating: rating.toString(),
      count,
    };
  });

  const hasData = data.some((item) => item.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Distribución de Ratings
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
                dataKey="rating"
                label={{ value: "Rating", position: "insideBottom", offset: -5 }}
                className="text-sm"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                label={{ value: "Cantidad", angle: -90, position: "insideLeft" }}
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
                formatter={(value: number) => [`${value} entradas`, "Cantidad"]}
              />
              <Bar
                dataKey="count"
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
