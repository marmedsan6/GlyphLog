# Arquitectura del Frontend

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| React | 18 | Librería UI principal, renderizado basado en componentes |
| Vite | 5.x | Bundler y servidor de desarrollo (HMR ultrarrápido) |
| TypeScript | 5.x | Tipado estático en todo el código |
| Tailwind CSS | 3.x | Utilidades CSS, diseño responsive |
| shadcn/ui | — | Componentes UI accesibles y estilizables sobre Radix UI |
| React Router | 6.x | Navegación client-side (SPA) |
| TanStack Query | 5.x | Gestión de server state, caché y sincronización con la API |

---

## Estructura de carpetas

```
apps/web/src/
├── components/
│   ├── ui/          # Componentes generados por shadcn/ui — no modificar directamente
│   └── shared/      # Componentes del dominio de GlyphLog (EntryCard, StatusBadge, etc.)
├── pages/           # Una carpeta/archivo por ruta. Orquestan componentes y hooks
├── hooks/           # Custom hooks reutilizables (lógica sin UI)
├── services/        # Funciones de llamada a la API (fetch / axios)
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

```tsx
// ✅ Wrapper en shared/
import { Button } from "@/components/ui/button";

export function DeleteButton({ onDelete }: DeleteButtonProps) {
  return (
    <Button variant="destructive" onClick={onDelete}>
      Eliminar
    </Button>
  );
}
```

---

## Gestión de estado

| Tipo de estado | Solución | Justificación |
|---|---|---|
| Estado local de componente | `useState` / `useForm` | Simple y suficiente para formularios, modales y lógica interna local |
| Estado global de UI / Auth | **Zustand** | Centraliza la autenticación (`useAuthStore`) y el tema visual (`useThemeStore`), eliminando re-renders del árbol de componentes y simplificando el acceso global. |
| Server state (datos de la API) | TanStack Query | Gestiona caché, loading/error states, invalidación de queries y sincronización automática. |

Se prefiere Zustand y TanStack Query sobre Context API o Redux para optimizar renders y simplificar la API.

---

## Routing

Configurado con **React Router v6** en modo browser history (`createBrowserRouter`).

### Rutas previstas

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `HomePage` | Público — redirige a `/collection` si autenticado |
| `/login` | `LoginPage` | Público |
| `/register` | `RegisterPage` | Público |
| `/collection` | `CollectionPage` | Protegida |
| `/entries/new` | `CreateEntryPage` | Protegida |
| `/entries/:id` | `EntryDetailPage` | Protegida |

Las rutas protegidas están envueltas en un componente `ProtectedRoute` que verifica la sesión activa. Si no hay token válido, redirige a `/login`.

---

## Llamadas a la API

### Patrón service layer

Todas las llamadas HTTP se centralizan en `src/services/`. Los componentes y hooks nunca usan `fetch` o `axios` directamente.

```typescript
// src/services/entry.service.ts
import { apiClient } from "@/lib/api-client";
import type { EntryCreate, EntryResponse, PaginatedEntryResponse } from "@/types";

export async function getEntries(params?: any): Promise<PaginatedEntryResponse> {
  const response = await apiClient.get<PaginatedEntryResponse>("/entries/", {
    params,
  });
  return response.data;
}

export async function createEntry(data: EntryCreate): Promise<EntryResponse> {
  const formData = new FormData();
  formData.append('title', data.title);
  // ...
  const response = await apiClient.post<EntryResponse>("/entries", formData, {
    headers: { 'Content-Type': undefined },
  });
  return response.data;
}
```

Los hooks de TanStack Query consumen estos servicios:

```typescript
// src/hooks/useEntries.ts
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/services/entry.service";

export function useEntries() {
  return useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });
}
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API REST para axios | `http://localhost:8000/api/v1` |
| `VITE_API_BASE_URL` | URL base sin prefijo (para recursos estáticos) | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google Console para el Login Social (opcional) | `123456-abcdef.apps.googleusercontent.com` |

Las variables de entorno de Vite deben tener el prefijo `VITE_` para ser accesibles en el cliente. Se definen en `.env.local` (no commiteado) y `.env.example` (commiteado como referencia).
