# Arquitectura del Frontend

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| React | 18 | Librería UI principal, renderizado basado en componentes |
| Vite | 5.x | Bundler y servidor de desarrollo (HMR) |
| TypeScript | 5.x | Tipado estático en todo el código |
| Tailwind CSS | 3.x | Utilidades CSS, diseño responsive |
| shadcn/ui | — | Componentes UI accesibles y estilizables sobre Radix UI |
| React Router | 6.x | Navegación client-side (SPA) |
| TanStack Query | 5.x | Server state: caché, sincronización e invalidación |
| Zustand | 5.x | Estado global de UI (auth, tema) |
| React Hook Form | 7.x | Formularios no controlados (eficiencia de re-render) |
| Zod | 4.x | Validación declarativa de formularios y contratos |
| Axios | 1.x | Cliente HTTP centralizado con interceptores |
| recharts | 3.x | Gráficos para estadísticas |
| react-easy-crop | 6.x | Recorte de portadas con zoom/arrastre |
| reicon-react | 1.x | Iconos SVG (tema toggle, ADR-007) |
| lucide-react | 0.x | Iconos principal de la app |

---

## Estructura de carpetas

```
apps/web/src/
├── components/
│   ├── ui/          # Componentes generados por shadcn/ui — no modificar directamente
│   └── shared/      # Componentes del dominio de GlyphLog (EntryCard, etc.)
├── pages/           # Una carpeta/archivo por ruta. Orquestan componentes y hooks
├── hooks/           # Custom hooks reutilizables (lógica sin UI)
├── services/        # Funciones de llamada a la API (axios)
├── stores/          # Stores de Zustand (auth, theme)
├── types/           # Interfaces y tipos TypeScript compartidos
├── utils/           # Funciones puras de utilidad (formatters, validators, etc.)
└── lib/             # Configuración de librerías externas (queryClient, axios instance, etc.)
```

---

## Convenciones de componentes React

### Functional components siempre

```tsx
// ✅ Correcto
export function EntryCard({ entry }: EntryCardProps) {
  return <div>{entry.title}</div>;
}

// ❌ Evitar — class components y default exports anónimos
export default class EntryCard extends React.Component { ... }
export default ({ e }: any) => <div>{e.title}</div>;
```

### Props tipadas con interface de TypeScript

```tsx
interface EntryCardProps {
  entry: Entry;
  onDelete?: (id: string) => void;
}

export function EntryCard({ entry, onDelete }: EntryCardProps) { ... }
```

### Named exports para todos los componentes

```tsx
// ✅
export function CreateEntryForm() { ... }

// ❌
export default function CreateEntryForm() { ... }
```

### shadcn/ui para componentes base

Los componentes de `src/components/ui/` son generados por `shadcn/ui` y no deben modificarse directamente. Para personalizar su comportamiento, crea un componente wrapper en `src/components/shared/`.

---

## Gestión de estado

| Tipo de estado | Solución | Justificación |
|---|---|---|
| Estado local de componente | `useState` | Simple para lógica interna local |
| Estado global de UI / Auth | **Zustand** | `auth.store.ts` y `theme.store.ts` centralizan estado sin re-renders innecesarios (selectores reactivos) |
| Server state (datos de la API) | TanStack Query | Caché, loading/error states, invalidación automática |

Se prefiere Zustand y TanStack Query sobre Context API o Redux. Los formularios usan **React Hook Form + Zod** (`entry-form-schema.ts`) para evitar re-renders por tecla y validar declarativamente.

---

## Routing

Configurado con **React Router v6** en modo browser history (`createBrowserRouter`).

### Rutas principales

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `HomePage` | Público — redirige a `/collection` si autenticado |
| `/login` | `LoginPage` | Público |
| `/register` | `RegisterPage` | Público |
| `/collection` | `CollectionPage` | Protegida |
| `/entries/new` | `CreateEntryPage` | Protegida |
| `/entries/:id` | `EntryDetailPage` | Protegida |
| `/profile` | `ProfilePage` | Protegida |
| `/recommendations` | `RecommendationsPage` | Protegida |
| `/chat` | `ChatPage` | Protegida |
| `/stats` | `StatsPage` | Protegida |

Las rutas protegidas están envueltas en un componente `ProtectedRoute` que verifica la sesión activa.

---

## Llamadas a la API

### Patrón service layer

Todas las llamadas HTTP se centralizan en `src/services/`. Los componentes y hooks nunca usan `fetch` o `axios` directamente.

```typescript
// src/services/entry.service.ts
import { apiClient } from "@/lib/api-client";
import type { EntryCreate, EntryResponse, PaginatedEntryResponse } from "@/types";

export async function getEntries(params?: EntryListParams): Promise<PaginatedEntryResponse> {
  const response = await apiClient.get<PaginatedEntryResponse>("/entries/", { params });
  return response.data;
}
```

Los hooks de TanStack Query consumen estos servicios:

```typescript
// src/hooks/useEntries.ts
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/services/entry.service";

export function useEntries(params?: EntryListParams) {
  return useQuery({
    queryKey: ["entries", params],
    queryFn: () => getEntries(params),
  });
}
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API REST para axios | `http://localhost:8000/api/v1` |
| `VITE_API_BASE_URL` | URL base sin prefijo (recursos estáticos) | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google Console (opcional) | `123456-abcdef.apps.googleusercontent.com` |

Las variables de Vite deben tener prefijo `VITE_`. Se definen en `.env.local` (no commiteado) y `.env.example` (commiteado como referencia).
