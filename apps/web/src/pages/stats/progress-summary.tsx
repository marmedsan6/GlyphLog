import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UserStats } from "@/services/stats.service";
import { BookOpen, Film, Gamepad2, Clock } from "lucide-react";

interface ProgressSummaryProps {
  stats: UserStats;
}

export function ProgressSummary({ stats }: ProgressSummaryProps) {
  const progressData = [
    {
      title: "Episodios de Anime",
      value: stats.totalProgress?.episodes || 0,
      icon: Film,
      color: "text-purple-600",
      barColor: "bg-purple-600",
    },
    {
      title: "Capítulos de Manga",
      value: stats.totalProgress?.chapters || 0,
      icon: BookOpen,
      color: "text-pink-600",
      barColor: "bg-pink-600",
    },
    {
      title: "Horas de Juego",
      value: stats.totalProgress?.hours || 0,
      icon: Clock,
      color: "text-green-600",
      barColor: "bg-green-600",
    },
  ];

  const totalEntries = stats.totalEntries || 1; // Avoid division by zero
  const completedEntries = stats.byStatus?.completed || 0;
  const completionPercentage = (completedEntries / totalEntries) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          Resumen de Progreso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress by unit type */}
        <div className="space-y-4">
          {progressData.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <span className="text-lg font-bold">{item.value.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall completion */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tasa de Completado</span>
            <span className="text-sm font-bold">
              {completionPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedEntries} completados</span>
            <span>{totalEntries} total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
