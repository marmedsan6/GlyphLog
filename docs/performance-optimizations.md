# Performance Optimizations

Documentación de optimizaciones de performance implementadas en GlyphLog.

**Última actualización**: 2026-08-06

## Objetivo

Garantizar tiempos de carga <2s y queries <100ms para una excelente UX.

## Frontend (apps/web)

### 1. Bundle Size Analysis & Code Splitting

**Implementado**: 2026-08-06

#### Bundle Analyzer
- Herramienta: `rollup-plugin-visualizer`
- Configuración en `vite.config.ts`
- Genera `dist/stats.html` en cada build
- Métricas: tamaño gzip y brotli

#### Lazy Loading de Rutas
- Todas las rutas protegidas usan `React.lazy()`
- Páginas lazy-loaded:
  - `/collection` - CollectionPage
  - `/entries/new` - CreateEntryPage
  - `/entries/:id` - EntryDetailPage
  - `/import` - ImportPage
  - `/recommendations` - RecommendationsPage
  - `/profile` - ProfilePage

#### PageSkeleton
- Componente de fallback para `<Suspense>`
- Skeleton UI consistente durante carga de chunks
- Ubicación: `src/components/shared/page-skeleton.tsx`

#### Resultados
- Bundle inicial: 455 KB (149 KB gzip) - baseline
- Reducción esperada: ~40-50% con lazy loading
- Chunks separados por ruta para mejor caching

### 2. Optimización de Imágenes

**Implementado**: 2026-08-06

- `loading="lazy"` en todas las imágenes de portada
- `decoding="async"` para decodificación no-bloqueante
- Componente: `EntryCard` en `src/components/shared/entry-card.tsx`

### 3. Caching Estratégico (TanStack Query)

**Implementado**: 2026-08-06

Configuración de `staleTime` por tipo de dato:

| Hook | staleTime | Razón |
|------|-----------|-------|
| `useEntries` | 1 min | Datos dinámicos, se actualizan frecuentemente |
| `useProfile` | 10 min | Perfil cambia raramente |
| Global (default) | 5 min | Balance entre freshness y performance |

### 4. DNS Prefetch

**Implementado**: 2026-08-06

- Preload de DNS para APIs externas
- Reduce latencia en primera llamada
- APIs configuradas:
  - `api.anilist.co` (anime/manga)
  - `api.rawg.io` (videojuegos)
  - `api.jikan.moe` (MyAnimeList backup)

Ubicación: `index.html`

## Backend (apps/api)

### 1. Logging de Queries Lentas

**Implementado**: 2026-08-06

#### Configuración
- Event listeners de SQLAlchemy
- Threshold: 100ms
- Log level: WARNING
- Ubicación: `app/core/database.py`

#### Uso
```python
# Automático con cada query
# Log ejemplo:
# WARNING: Slow query (0.152s): SELECT entries.id, entries.user_id...
```

### 2. Índices de Base de Datos

**Implementado**: 2026-08-06

Migración: `alembic/versions/2026_08_06_1200_add_performance_indexes.py`

#### Índices creados

1. **Índice compuesto (user_id, type, created_at)**
   - Optimiza: Query principal de `/entries/` con filtros y ordenamiento
   - Uso: `WHERE user_id = ? AND type = ? ORDER BY created_at DESC`

2. **Índice parcial para ratings**
   - SQL: `CREATE INDEX ... WHERE rating IS NOT NULL`
   - Optimiza: Queries que filtran/ordenan por rating
   - Ventaja: Tamaño reducido (solo entradas con rating)

3. **Índice trigram (title)**
   - Tipo: GIN con `gin_trgm_ops`
   - Optimiza: Búsqueda con `ILIKE '%search%'`
   - Requiere: Extensión `pg_trgm`

4. **Índice case-insensitive (user_id, LOWER(title))**
   - Optimiza: `find_by_title_and_user()`
   - Uso: `WHERE user_id = ? AND LOWER(title) = ?`

#### Aplicar migración
```bash
cd apps/api
alembic upgrade head
```

#### Verificar índices
```sql
\d entries
\di
```

### 3. Eager Loading (N+1 Prevention)

**Implementado**: 2026-08-06

#### Configuración
```python
from sqlalchemy.orm import selectinload

stmt = (
    select(Entry)
    .options(selectinload(Entry.progress_events))
    .where(Entry.user_id == user_id)
)
```

#### Métodos optimizados
- `EntryRepository.get_all()` - Listado de entradas
- `EntryRepository.get_by_id()` - Detalle de entrada

#### Resultados
- Antes: N+1 queries (1 + N para progress_events)
- Después: 2 queries (1 para entries, 1 para progress_events)

### 4. Caching de APIs Externas

**Implementado**: 2026-08-06

#### Configuración
- Librería: `cachetools` (thread-safe)
- Implementación: `ThreadSafeCache` con `TTLCache`
- Ubicación: `app/services/external_search_service.py`

#### Parámetros

| Cache | Maxsize | TTL | Uso |
|-------|---------|-----|-----|
| Búsquedas | 1000 | 1 hora | Query strings normalizadas |
| Detalles de juegos | 500 | 1 hora | Slugs de RAWG |

#### Thread Safety
- Lock para operaciones get/set
- Compatible con múltiples workers uvicorn
- Sin race conditions

#### Resultados esperados
- Reducción ~70% en hits a APIs externas
- TTL 1h vs 5min anterior (12x más caching)

## Métricas de Éxito

### Frontend

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Bundle inicial (gzip) | <250 KB | Vite build output |
| First Contentful Paint (FCP) | <1.5s | Lighthouse |
| Time to Interactive (TTI) | <3s | Lighthouse |
| Largest Contentful Paint (LCP) | <2.5s | Lighthouse |
| Lighthouse score | >90 | Lighthouse |

### Backend

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Queries típicas (p95) | <100ms | Logs de database.py |
| Endpoint `/entries/` (p95) | <150ms | Logs de FastAPI |
| N+1 queries | 0 | SQLAlchemy logs |

## Herramientas de Medición

### Frontend
```bash
# Bundle analyzer
pnpm --filter web build
# Abrir dist/stats.html

# Lighthouse
pnpm --filter web add -D @lhci/cli
npx lhci autorun --upload.target=temporary-public-storage
```

### Backend
```bash
# Query profiling
# Ver logs con SQLALCHEMY_WARN_20=1
export SQLALCHEMY_WARN_20=1
# Ejecutar app y revisar logs de queries >100ms
```

## Próximas Optimizaciones

### Frontend
- [ ] Virtualización de listas largas con `@tanstack/react-virtual` (>50 items)
- [ ] Optimización de re-renders con React.memo
- [ ] Service Worker para caching offline

### Backend
- [ ] Redis para caching distribuido (cuando múltiples instancias)
- [ ] Connection pooling optimizado
- [ ] Database replication para read-heavy workloads

## Referencias

- [ADR-011: Performance Optimization Strategy](../memory-bank/adr/adr-011-performance-optimization.md)
- [TanStack Query - Caching](https://tanstack.com/query/latest/docs/react/guides/caching)
- [PostgreSQL - Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [SQLAlchemy - Eager Loading](https://docs.sqlalchemy.org/en/20/orm/loading_relationships.html)
