import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserStats } from "@/services/stats.service";
import { BookOpen, Film, Gamepad2, Star, TrendingUp, CheckCircle2 } from "lucide-react";

interface StatsOverviewProps {
  stats: UserStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const totalEntries = stats.totalEntries || 0;
  const animeCount = stats.byType?.anime || 0;
  const mangaCount = stats.byType?.manga || 0;
  const gameCount = stats.byType?.game || 0;
  const avgRating = stats.averageRating || 0;
  const completedCount = stats.byStatus?.completed || 0;

  const cards = [
    {
      title: "Total de Entradas",
      value: totalEntries,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Anime",
      value: animeCount,
      icon: Film,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Manga",
      value: mangaCount,
      icon: BookOpen,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
    {
      title: "Juegos",
      value: gameCount,
      icon: Gamepad2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Rating Promedio",
      value: avgRating.toFixed(1),
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Completados",
      value: completedCount,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
