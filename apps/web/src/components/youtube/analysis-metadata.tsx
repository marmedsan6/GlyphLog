/**
 * Panel lateral con metadata del análisis de YouTube.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Youtube, Video, Package, Sparkles, Zap } from 'lucide-react'
import type { AnalysisMetadata } from '@/types/youtube-discovery'

interface AnalysisMetadataProps {
  metadata: AnalysisMetadata
}

export function AnalysisMetadataPanel({ metadata }: AnalysisMetadataProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num)
  }

  const stats = [
    {
      icon: Youtube,
      label: 'Canales analizados',
      value: metadata.channels_analyzed,
    },
    {
      icon: Video,
      label: 'Vídeos revisados',
      value: metadata.videos_analyzed,
    },
    {
      icon: Package,
      label: 'Títulos encontrados',
      value: metadata.titles_found,
    },
    {
      icon: Sparkles,
      label: 'Nuevas sugerencias',
      value: metadata.new_suggestions,
      highlight: true,
    },
    {
      icon: Zap,
      label: 'Tokens usados',
      value: formatNumber(metadata.tokens_used),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis completado</CardTitle>
        <CardDescription>
          {new Date(metadata.analyzed_at).toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.highlight ? 'text-primary' : ''
                  }`}
                >
                  {stat.value}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
