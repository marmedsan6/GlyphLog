/**
 * Tipos para el sistema de descubrimiento desde YouTube.
 *
 * Define las estructuras de datos para análisis de canales y sugerencias.
 */

export type EntryType = "anime" | "manga" | "game";

export interface YoutubeSuggestion {
  title: string;
  type: EntryType;
  mentioned_by: string;
  video_title: string;
  video_url: string;
  opinion: "positive" | "mixed" | "negative";
  rating: number | null;
  timestamp: string | null;
  in_collection: boolean;
  external_url: string | null;
  cover_image_url: string | null;
}

export interface AnalysisMetadata {
  channels_analyzed: number;
  videos_analyzed: number;
  titles_found: number;
  new_suggestions: number;
  tokens_used: number;
  analyzed_at: string;
}

export interface YoutubeAnalysisRequest {
  channel_urls: string[];
}

export interface YoutubeAnalysisResponse {
  suggestions: YoutubeSuggestion[];
  metadata: AnalysisMetadata;
}
