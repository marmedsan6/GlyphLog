# [FEAT] Descubrimiento de contenido desde canales de YouTube con Claude

## Contexto

Los usuarios de GlyphLog suelen seguir canales de YouTube especializados en anime/manga/videojuegos (ej: The Anime Man, Gigguk, IGN, GameSpot). Estos canales publican reviews, recomendaciones y análisis que podrían traducirse en nuevas entradas para la colección.

Actualmente, el usuario debe:
1. Ver el vídeo en YouTube
2. Recordar el título mencionado
3. Abrir GlyphLog
4. Buscar manualmente y añadir a su lista

Este flujo tiene alta fricción y muchas recomendaciones se pierden.

## Objetivo

Crear una funcionalidad de "Descubrimiento desde YouTube" en `/discover/youtube` donde:

1. El usuario añade canales de YouTube que sigue (ej: "The Anime Man", "Gigguk")
2. Claude/Bedrock analiza los últimos 10-20 vídeos de cada canal
3. Extrae los animes/mangas/juegos mencionados con opiniones/ratings
4. Cruza con la colección del usuario: "Ya viste X, pero mencionan Y que no tienes"
5. Genera lista de sugerencias: "The Anime Man recomendó Death Note (9/10) en su vídeo 'Top 10 Thrillers'"

**Beneficio:** El usuario descubre contenido de sus creadores favoritos sin tener que ver todos los vídeos.

## Implementación

### Backend

**Schemas creados:**
- `apps/api/app/schemas/youtube_discovery.py`
  - `YoutubeSuggestion`: Estructura de una sugerencia
  - `AnalysisMetadata`: Metadata del análisis
  - `YoutubeAnalysisRequest` y `YoutubeAnalysisResponse`

**Integración con YouTube:**
- `apps/api/app/integrations/youtube/client.py`
  - `YouTubeClient`: Wrapper para YouTube Data API v3
  - Extracción de channel IDs desde URLs
  - Obtención de vídeos recientes (últimos 20, últimos 6 meses)
  - Extracción de transcripts con `youtube-transcript-api`
  - Fallback a título + descripción si no hay transcript
  - Caché de 24h para evitar agotar quota

**Servicio de análisis:**
- `apps/api/app/services/youtube_discovery_service.py`
  - `YoutubeDiscoveryService`: Orquesta todo el flujo
  - Obtiene vídeos de canales
  - Extrae transcripts
  - Analiza con Claude/Bedrock (Sonnet 4.5)
  - Cruza con colección del usuario
  - Devuelve sugerencias enriquecidas

**Router:**
- `apps/api/app/routers/youtube_discovery.py`
  - `POST /api/v1/discover/youtube/analyze`
  - Requiere JWT
  - Máximo 5 canales por request
  - Validación de YOUTUBE_API_KEY (503 si no configurada)

**Configuración:**
- Variable de entorno `YOUTUBE_API_KEY` añadida a `.env.example`
- Campo `youtube_api_key` en `Settings` (config.py)
- Dependencias añadidas a `requirements.txt`:
  - `google-api-python-client==2.158.0`
  - `youtube-transcript-api==0.6.3`

### Frontend

**Tipos:**
- `apps/web/src/types/youtube-discovery.ts`
  - Interfaces TypeScript para sugerencias, metadata y requests

**Servicios:**
- `apps/web/src/services/youtube-discovery.service.ts`
  - `analyzeChannels()`: Llama al endpoint de análisis
  - `addSuggestionToCollection()`: Añade sugerencia como entrada

**Hooks:**
- `apps/web/src/hooks/useAnalyzeChannels.ts`: Mutation para analizar
- `apps/web/src/hooks/useYoutubeChannels.ts`: Gestión de canales en localStorage

**Componentes:**
- `apps/web/src/components/youtube/youtube-channel-manager.tsx`
  - Gestión de hasta 5 canales
  - Input para añadir y eliminar canales
  - Persistencia en localStorage

- `apps/web/src/components/youtube/youtube-suggestion-card.tsx`
  - Card individual por sugerencia
  - Muestra: título, tipo, opinión, rating, canal, vídeo
  - Badges: "Nuevo" vs "En tu lista"
  - Acciones: "Ver vídeo" (con timestamp), "Añadir a mi lista"

- `apps/web/src/components/youtube/analysis-metadata.tsx`
  - Panel lateral con estadísticas del análisis
  - Canales, vídeos, títulos encontrados, tokens usados

**Página:**
- `apps/web/src/pages/discover/youtube.tsx`
  - Layout con 2 columnas
  - Izquierda: Gestión de canales + botón de análisis + metadata
  - Derecha: Resultados (nuevas sugerencias + ya en lista)
  - Estados: loading, error, success, empty

**Routing:**
- Ruta `/discover/youtube` añadida en `App.tsx`
- Lazy loading con React.lazy

## Criterios de aceptación

✅ El usuario puede añadir hasta 5 canales de YouTube
✅ Al analizar, se procesan los últimos 10-20 vídeos de cada canal
✅ Las sugerencias incluyen: título, tipo, canal, vídeo, opinión, rating (si disponible), timestamp
✅ Las sugerencias se marcan si ya están en la colección del usuario
✅ El usuario puede añadir una sugerencia nueva a su colección con un clic (estado plan_to_watch)
✅ El usuario puede ver el vídeo con timestamp directo al momento de la mención
✅ Si un canal no tiene vídeos recientes o no hay transcripts, se muestra advertencia pero no falla
✅ Se muestra metadata del análisis (canales, vídeos, tokens usados)
✅ Si YOUTUBE_API_KEY no está configurada, el endpoint responde 503
✅ Los canales se persisten en localStorage

## Notas técnicas

### Prompt de Claude

El servicio usa un prompt estructurado que:
- Instruye a Claude a extraer solo menciones explícitas
- Clasifica opiniones en: positive, mixed, negative
- Extrae ratings numéricos si se mencionan explícitamente
- Estima timestamps aproximados
- Devuelve JSON puro (sin markdown)

### Quota de YouTube API

- Quota diaria: 10,000 units
- Búsqueda de canal: ~100 units
- 5 canales × 20 vídeos = ~500 units por análisis
- Caché de 24h reduce consumo en análisis repetidos

### Tokens de Bedrock

- Modelo: Sonnet 4.5 (us.anthropic.claude-sonnet-4-5-20250929-v1:0)
- Consumo estimado: 40-60k tokens por análisis de 3-5 canales
- Temperature: 0.3 (más determinista para extracción)

### Limitaciones actuales

- No hay caché de sugerencias en backend (cada análisis es nuevo)
- No se enriquece con AniList/RAWG (campos `external_url` y `cover_image_url` en `null`)
- No se calcula el `tokens_used` real (siempre es 0)
- No hay tabla `user_youtube_channels` en BD (los canales solo están en localStorage)

### Mejoras futuras

- Enriquecer sugerencias con AniList/RAWG (portadas, enlaces externos)
- Caché de sugerencias en backend (Redis o tabla `youtube_analysis_cache`)
- Persistir canales en BD en lugar de localStorage
- Calcular tokens reales consumidos en Bedrock
- Rate limiting por usuario
- Historial de análisis pasados
- Notificaciones cuando un canal sube un vídeo nuevo con recomendaciones

## Archivos creados/modificados

### Backend
- ✅ `apps/api/requirements.txt` (añadidas dependencias)
- ✅ `apps/api/.env.example` (añadida YOUTUBE_API_KEY)
- ✅ `apps/api/app/core/config.py` (campo youtube_api_key)
- ✅ `apps/api/app/schemas/youtube_discovery.py` (nuevo)
- ✅ `apps/api/app/integrations/youtube/__init__.py` (nuevo)
- ✅ `apps/api/app/integrations/youtube/client.py` (nuevo)
- ✅ `apps/api/app/services/youtube_discovery_service.py` (nuevo)
- ✅ `apps/api/app/routers/youtube_discovery.py` (nuevo)
- ✅ `apps/api/app/main.py` (registrado router)

### Frontend
- ✅ `apps/web/src/types/youtube-discovery.ts` (nuevo)
- ✅ `apps/web/src/services/youtube-discovery.service.ts` (nuevo)
- ✅ `apps/web/src/hooks/useAnalyzeChannels.ts` (nuevo)
- ✅ `apps/web/src/hooks/useYoutubeChannels.ts` (nuevo)
- ✅ `apps/web/src/components/youtube/youtube-channel-manager.tsx` (nuevo)
- ✅ `apps/web/src/components/youtube/youtube-suggestion-card.tsx` (nuevo)
- ✅ `apps/web/src/components/youtube/analysis-metadata.tsx` (nuevo)
- ✅ `apps/web/src/pages/discover/youtube.tsx` (nuevo)
- ✅ `apps/web/src/App.tsx` (añadida ruta)

### Documentación
- ✅ `docs/tasks/FEAT-youtube-discovery.md` (este archivo)

## Testing

**Backend:**
- Pendiente: Tests con mocks de YouTube API
- Pendiente: Tests con mocks de Bedrock
- Pendiente: Tests de cruce con colección

**Frontend:**
- Pendiente: Tests de componentes
- Pendiente: Tests de hooks
- Pendiente: Tests de integración

## Despliegue

**Variables de entorno requeridas:**
```bash
YOUTUBE_API_KEY=<tu_api_key_de_youtube>
# Las credenciales de AWS (para Bedrock) deben estar configuradas
```

**Instalación de dependencias:**
```bash
# Backend
cd apps/api
uv pip install -r requirements.txt

# Frontend (no hay nuevas dependencias)
```

**Verificación:**
1. Backend: `http://localhost:8000/docs` → verificar endpoint `/api/v1/discover/youtube/analyze`
2. Frontend: `http://localhost:5173/discover/youtube` → verificar UI

---

**Estado:** ✅ Implementado
**Fecha:** 2026-08-06
**Branch:** `feature/youtube-discovery-51`
