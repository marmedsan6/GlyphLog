# Plan de Ejecución — Batch de Fixes y Mejoras (Julio 2026)

> **Fecha:** julio 2026
> **Issues:** 4 (2 fixes, 1 setup, 1 feature)

---

## Resumen

| # | Issue | Tipo | Severidad | Esfuerzo estimado | Archivo |
|---|-------|------|-----------|-------------------|---------|
| 1 | Cache leak de TanStack Query entre cuentas | FIX | P0 — blocker | 20-30 min | `FIX-cache-leak-on-logout.md` |
| 2 | Google OAuth no funciona en local | SETUP | P1 — critical | 15-20 min | `FIX-google-oauth-local-setup.md` |
| 3 | Autocompletados invisibles en modo oscuro | FIX | P2 — major | 15-20 min | `FIX-dark-mode-autocomplete.md` |
| 4 | Image cropper para portadas | FEAT | P3 — minor | 1.5-2 horas | `FEAT-image-cropper.md` |

**Esfuerzo total estimado:** 2.5-3.5 horas

---

## Orden de ejecución

```
┌─────────────────────────────────────────────────────────────┐
│  FASE 1 — Bugs críticos (independientes, ejecutar primero)  │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────┐       │
│  │ #1 Cache leak    │    │ #2 Google OAuth local    │       │
│  │ P0 — 20-30 min   │ →  │ P1 — 15-20 min           │       │
│  │ auth.store.ts    │    │ docker-compose.yml       │       │
│  │ api-client.ts    │    │ docs/SETUP.md            │       │
│  └──────────────────┘    └──────────────────────────┘       │
│          ↓ Verificar: login A → logout → login B            │
│          ↓ Verificar: botón Google visible en local         │
├─────────────────────────────────────────────────────────────┤
│  FASE 2 — Fix de UX (independiente)                         │
│                                                             │
│  ┌──────────────────────────────────┐                       │
│  │ #3 Autocomplete dark mode        │                       │
│  │ P2 — 15-20 min                   │                       │
│  │ external-search-autocomplete.tsx │                       │
│  └──────────────────────────────────┘                       │
│          ↓ Verificar: autocomplete visible en dark mode     │
├─────────────────────────────────────────────────────────────┤
│  FASE 3 — Feature nueva (independiente, más compleja)       │
│                                                             │
│  ┌──────────────────────────────────┐                       │
│  │ #4 Image cropper                 │                       │
│  │ P3 — 1.5-2 horas                │                       │
│  │ image-cropper.tsx (nuevo)        │                       │
│  │ image-uploader.tsx               │                       │
│  │ entry-detail-view.tsx            │                       │
│  └──────────────────────────────────┘                       │
│          ↓ Verificar: crop + zoom + imagen más grande       │
├─────────────────────────────────────────────────────────────┤
│  FASE 4 — Validación final                                  │
│                                                             │
│  • pnpm test (210 tests passing)                            │
│  • pnpm lint (ruff + eslint)                                │
│  • pnpm build (0 errores)                                   │
│  • Verificación E2E manual de los 4 issues                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependencias

**Ninguna.** Los 4 issues son completamente independientes entre sí. El orden propuesto es por prioridad (P0 → P1 → P2 → P3), no por dependencias técnicas.

---

## Detalle por fase

### Fase 1A: Cache Leak (P0)

**Qué:** Añadir `queryClient.clear()` al flujo de logout.
**Archivos a modificar:**
- `apps/web/src/stores/auth.store.ts` — importar `queryClient`, añadir `queryClient.clear()` en `logout()`
- `apps/web/src/lib/api-client.ts` — añadir `queryClient.clear()` en el interceptor 401 (defensa en profundidad)
- `apps/web/src/stores/auth.store.test.ts` — mockear `queryClient.clear()` y verificar llamada

**Verificación:**
1. Login con Cuenta A → ver colección → logout
2. Login con Cuenta B (sin recargar) → la colección está vacía o muestra solo entradas de B
3. `pnpm test` pasa

### Fase 1B: Google OAuth Local (P1)

**Qué:** Configurar variables de entorno de Google OAuth en `docker-compose.yml`.
**Archivos a modificar:**
- `docker-compose.yml` — añadir `GOOGLE_CLIENT_ID` al servicio `api` y `VITE_GOOGLE_CLIENT_ID` al servicio `web`

**Verificación:**
1. Exportar `GOOGLE_CLIENT_ID` en el shell
2. `docker compose up -d`
3. Navegar a `/login` → botón "Continuar con Google" visible
4. Click → redirect a Google → callback → login exitoso

### Fase 2: Autocomplete Dark Mode (P2)

**Qué:** Corregir clases CSS con opacity modifiers que fallan en dark mode.
**Archivos a modificar:**
- `apps/web/src/components/shared/entry-form/external-search-autocomplete.tsx`
  - `bg-popover/95` → `bg-popover`
  - `bg-muted/30` → `bg-muted` (en input)
  - Añadir `text-foreground` al input
  - `hover:bg-muted/70` → `hover:bg-muted`
  - `active:bg-muted` → `active:bg-accent`

**Verificación:**
1. Activar dark mode
2. Ir a `/entries/create`
3. Escribir 3+ caracteres en el buscador de catálogo
4. Dropdown visible con fondo oscuro, texto claro, hover distinguible

### Fase 3: Image Cropper (P3)

**Qué:** Integrar `react-easy-crop` para permitir zoom y arrastre de imágenes subidas localmente + agrandar imagen en vista de detalle.
**Archivos a crear/modificar:**
- `apps/web/src/components/shared/entry-form/image-cropper.tsx` — NUEVO
- `apps/web/src/components/shared/entry-form/image-uploader.tsx` — integrar cropper
- `apps/web/src/pages/entry-detail/entry-detail-view.tsx` — agrandar columna de imagen
- `apps/web/package.json` — añadir `react-easy-crop`

**Verificación:**
1. Subir imagen local → aparece cropper con zoom slider y arrastre
2. Ajustar y guardar → la imagen subida está recortada según el ajuste
3. Imagen de catálogo externo → NO aparece cropper (preview normal)
4. Vista de detalle → imagen más grande que antes
5. Funciona en light y dark mode

### Fase 4: Validación Final

```bash
# Desde la raíz del monorepo
pnpm test          # 210+ tests passing
pnpm lint          # ruff + eslint sin errores
pnpm build         # build de producción sin errores
```

---

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| `react-easy-crop` incompatible con TypeScript strict | Baja | Medio | Verificar tipos en ` DefinitelyTyped`; si no existen, crear declaración mínima |
| `queryClient.clear()` en el store causa problemas de importación circular | Baja | Alto | Si ocurre, mover la llamada a `app-layout.tsx` en lugar del store |
| Opacity modifiers de oklch funcionan bien en Tailwind 3.x y el bug es otro | Media | Bajo | Verificar con DevTools antes de cambiar; si las clases generan CSS válido, buscar otra causa |

---

## Commits sugeridos

```
fix: clear TanStack Query cache on logout to prevent cross-account data leak
setup: add Google OAuth env vars to local docker-compose
fix: correct autocomplete dropdown visibility in dark mode
feat: add image cropper for locally uploaded cover images
```
