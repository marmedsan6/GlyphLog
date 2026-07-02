# Patrones de Código — GlyphLog

> Referencia de patrones y convenciones establecidas en el proyecto.
> Consultar este archivo antes de crear nuevos componentes, hooks, servicios o endpoints.
> Actualizar cuando se adopten nuevos patrones.

---

## 1. Componentes React

### Estructura base

Un componente sigue esta estructura:

```typescript
// apps/web/src/components/shared/entry-card.tsx

import { type EntryCardProps } from "@/types/entry";
import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/utils/entry-utils";

export function EntryCard({ entry }: EntryCardProps) {
  const statusLabel = getStatusLabel(entry.status);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-lg">{entry.title}</h3>
      <Badge variant="secondary">{statusLabel}</Badge>
    </div>
  );
}
```

### Reglas

- **Named export** siempre (`export function`, nunca `export default`).
- El nombre del archivo es `kebab-case`. El nombre del componente es `PascalCase`.
- Las props se tipan con una interfaz o tipo con el sufijo `Props`.
- Los componentes son **funciones puras** cuando es posible (sin estado ni efectos).
- Si el componente crece, dividirlo en componentes más pequeños.
- No poner lógica de negocio directamente en el JSX. Extraer a variables o funciones.

---

## 2. Custom Hooks

### Estructura base

```typescript
// apps/web/src/hooks/use-entries.ts

import { useState, useEffect } from "react";
import { entriesService } from "@/services/entries-service";
import type { Entry } from "@/types/entry";

interface UseEntriesReturn {
  entries: Entry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEntries(): UseEntriesReturn {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await entriesService.getAll();
      setEntries(data);
    } catch (err) {
      setError("No se pudieron cargar las entradas. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return { entries, isLoading, error, refetch: fetchEntries };
}
```

### Reglas

- Nombre siempre con prefijo `use` en `camelCase`.
- El archivo es `kebab-case`: `use-entries.ts`.
- Definir y exportar el tipo de retorno del hook.
- Separar el fetching de datos del renderizado. El hook no devuelve JSX.
- Los errores deben ser mensajes legibles por el usuario, no mensajes técnicos crudos.

---

## 3. Service layer (frontend)

Los servicios encapsulan todas las llamadas a la API. Los componentes y hooks **nunca** llaman a `fetch` directamente.

### Estructura base

```typescript
// apps/web/src/services/entries-service.ts

import { apiClient } from "@/lib/api-client";
import type { Entry, CreateEntryRequest } from "@/types/entry";

export const entriesService = {
  async getAll(): Promise<Entry[]> {
    const response = await apiClient.get<Entry[]>("/entries");
    return response.data;
  },

  async getById(id: number): Promise<Entry> {
    const response = await apiClient.get<Entry>(`/entries/${id}`);
    return response.data;
  },

  async create(payload: CreateEntryRequest): Promise<Entry> {
    const response = await apiClient.post<Entry>("/entries", payload);
    return response.data;
  },

  async update(id: number, payload: Partial<CreateEntryRequest>): Promise<Entry> {
    const response = await apiClient.patch<Entry>(`/entries/${id}`, payload);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/entries/${id}`);
  },
};
```

### Reglas

- Los servicios son objetos con métodos `async`, no clases.
- Un servicio por recurso de la API (entries, users, etc.).
- Siempre tipar el request y el response.
- Los servicios no manejan errores: los errores se propagan al hook o componente que los llame.
- El cliente HTTP (`apiClient`) vive en `src/lib/api-client.ts` y centraliza la configuración base (base URL, headers, interceptors).

---

## 4. Router FastAPI

### Estructura base

```python
# apps/api/app/routers/entries.py

from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.entry import EntryCreate, EntryUpdate, EntryResponse
from app.services.entry_service import EntryService
from app.core.dependencies import get_entry_service

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("/", response_model=list[EntryResponse])
async def list_entries(
    service: EntryService = Depends(get_entry_service),
) -> list[EntryResponse]:
    return await service.get_all()


@router.post("/", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: EntryCreate,
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    return await service.create(payload)


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(
    entry_id: int,
    service: EntryService = Depends(get_entry_service),
) -> EntryResponse:
    entry = await service.get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entry with id {entry_id} not found",
        )
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: int,
    service: EntryService = Depends(get_entry_service),
) -> None:
    await service.delete(entry_id)
```

### Reglas

- El router **no contiene lógica de negocio**. Solo valida la request, delega al servicio y devuelve la response.
- Usar `Depends()` para inyectar el servicio. Nunca instanciar el servicio directamente en el router.
- Los errores HTTP deben tener mensajes descriptivos en el campo `detail`.
- Declarar siempre `response_model` y el tipo de retorno en la firma.
- Los routers se registran en `main.py` con `app.include_router(router, prefix="/api/v1")`.

---

## 5. Service FastAPI

### Estructura base

```python
# apps/api/app/services/entry_service.py

from app.repositories.entry_repository import EntryRepository
from app.schemas.entry import EntryCreate, EntryUpdate, EntryResponse
from app.models.entry import Entry


class EntryService:
    def __init__(self, repository: EntryRepository) -> None:
        self.repository = repository

    async def get_all(self) -> list[EntryResponse]:
        entries = await self.repository.find_all()
        return [EntryResponse.model_validate(e) for e in entries]

    async def get_by_id(self, entry_id: int) -> EntryResponse | None:
        entry = await self.repository.find_by_id(entry_id)
        if not entry:
            return None
        return EntryResponse.model_validate(entry)

    async def create(self, payload: EntryCreate) -> EntryResponse:
        entry = await self.repository.create(payload)
        return EntryResponse.model_validate(entry)

    async def delete(self, entry_id: int) -> None:
        await self.repository.delete(entry_id)
```

### Reglas

- El servicio recibe el repositorio por inyección de dependencias en el constructor.
- El servicio **no ejecuta queries SQL directamente**. Delega siempre en el repositorio.
- El servicio convierte modelos SQLAlchemy a schemas Pydantic antes de devolverlos.
- Usar `model_validate()` (Pydantic v2) para convertir ORM models a response schemas.

---

## 6. Schemas Pydantic

### Separación request/response

```python
# apps/api/app/schemas/entry.py

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.entry import EntryType, EntryStatus


class EntryBase(BaseModel):
    title: str
    entry_type: EntryType
    status: EntryStatus


class EntryCreate(EntryBase):
    """Schema para crear una entrada. Solo los campos que envía el cliente."""
    pass


class EntryUpdate(BaseModel):
    """Schema para actualizar una entrada. Todos los campos son opcionales."""
    title: str | None = None
    status: EntryStatus | None = None


class EntryResponse(EntryBase):
    """Schema de respuesta. Incluye campos generados por el servidor."""
    id: int
    created_at: datetime
    updated_at: datetime

    # Permite que Pydantic lea atributos de un objeto ORM (SQLAlchemy)
    model_config = ConfigDict(from_attributes=True)
```

### Reglas

- Nunca exponer el modelo SQLAlchemy directamente en la respuesta de la API.
- Separar siempre en al menos dos schemas: uno para crear/actualizar (input) y otro para responder (output).
- El schema de respuesta siempre tiene `model_config = ConfigDict(from_attributes=True)` para compatibilidad con ORM.
- Los schemas de update tienen todos sus campos como opcionales (`field | None = None`).

---

## 7. Migraciones Alembic

### Crear una nueva migración

```bash
# Desde apps/api/
# 1. Hacer cambios en los modelos SQLAlchemy (app/models/)

# 2. Generar la migración automáticamente
alembic revision --autogenerate -m "descripcion_corta_en_snake_case"

# 3. Revisar el archivo generado en alembic/versions/ antes de aplicar
# Verificar que upgrade() y downgrade() son correctos

# 4. Aplicar la migración
alembic upgrade head
```

### Hacer rollback de una migración

```bash
# Volver una migración atrás
alembic downgrade -1

# Volver al estado inicial (sin tablas)
alembic downgrade base
```

### Ver el estado de las migraciones

```bash
# Ver la migración actual aplicada
alembic current

# Ver el historial de migraciones
alembic history --verbose
```

### Reglas

- **Revisar siempre** el archivo de migración generado antes de aplicarlo. Las migraciones automáticas no son perfectas.
- Cada migración debe tener una descripción clara y en snake_case: `add_status_column_to_entries`.
- Las migraciones deben ser **reversibles**: siempre implementar `downgrade()`.
- No editar migraciones ya aplicadas en producción. Crear una nueva migración para corregir.

---

## 8. Naming — Resumen de referencia rápida

| Artefacto | Convención | Ejemplo |
|-----------|-----------|---------|
| Archivos TypeScript/TSX | `kebab-case` | `entry-card.tsx`, `use-entries.ts` |
| Componentes React | `PascalCase` | `EntryCard`, `CollectionPage` |
| Hooks | `camelCase` con prefijo `use` | `useEntries`, `useAuth` |
| Funciones y variables TS | `camelCase` | `getStatusLabel`, `isLoading` |
| Constantes TS | `UPPER_SNAKE_CASE` | `MAX_ENTRIES`, `API_BASE_URL` |
| Tipos e interfaces TS | `PascalCase` | `Entry`, `EntryCardProps` |
| Archivos Python | `snake_case` | `entry_router.py`, `entry_service.py` |
| Funciones y variables Python | `snake_case` | `get_entry_by_id`, `entry_id` |
| Clases Python | `PascalCase` | `EntryService`, `EntryRepository` |
| Rutas de API | `kebab-case` | `/api/v1/user-entries` |
| Tablas de BD | `snake_case` plural | `entries`, `user_entries` |
| Columnas de BD | `snake_case` | `created_at`, `entry_type` |
| Variables de entorno | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `SECRET_KEY` |

---

## 9. Patrones establecidos en T-011-FE

### 9.1 Invalidación de queries tras mutación

Las mutaciones de TanStack Query invalidan la query key raíz del recurso afectado para forzar una recarga automática de todas las vistas que dependen de él.

```typescript
// apps/web/src/hooks/use-create-entry.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntry } from '@/services/entry.service'
import { ENTRIES_QUERY_KEY } from './useEntries'

export function useCreateEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENTRIES_QUERY_KEY] })
    },
  })
}
```

**Reglas:**
- Invalidar la query key raíz (`['entries']`) para cubrir todas las combinaciones de filtros y paginación.
- El hook de mutación vive en `src/hooks/` y sigue la convención `use-{accion}.ts`.

### 9.2 Redirección con aviso tras sesión expirada

El interceptor de Axios redirige a `/login?sessionExpired=1` cuando recibe un 401 no autenticado. `LoginPage` lee el query param y muestra un banner informativo.

**Reglas:**
- Usar query params para comunicar estado transitorio entre redirecciones, no `sessionStorage`.
- Excluir rutas de autenticación (`/auth/login`, `/auth/register`) del comportamiento de redirección forzada.

### 9.3 URLs de recursos estáticos

Cuando el backend sirve archivos estáticos desde la raíz del dominio (por ejemplo, `/uploads`), se usa una variable de entorno separada `VITE_API_BASE_URL` sin el prefijo `/api/v1`.

```typescript
// apps/web/src/utils/cover-image-url.ts
export function getCoverImageUrl(coverImage: string | null): string | null {
  if (!coverImage) return null
  const normalizedPath = coverImage.startsWith('/') ? coverImage : `/${coverImage}`
  return `${env.apiBaseUrl}${normalizedPath}`
}
```

**Reglas:**
- `VITE_API_URL` es para llamadas REST (`/api/v1`).
- `VITE_API_BASE_URL` es para recursos estáticos (`/uploads`).
- En desarrollo, añadir `/uploads` al proxy de Vite.

### 9.4 Google Identity Services directo (no `useGoogleLogin`)

Cuando el backend espera un `id_token` JWT (no un `access_token` OAuth 2.0), el frontend debe usar `google.accounts.id` directamente, **NO** `useGoogleLogin` de `@react-oauth/google`.

**Por qué:** `useGoogleLogin({ flow: 'implicit' })` devuelve un `access_token` (flujo OAuth 2.0 Token Client), NO un `id_token` JWT firmado por Google. Solo `google.accounts.id` (vía `prompt()` o `renderButton()`) devuelve el `CredentialResponse.credential` que es el `id_token` esperado por el backend.

**Patrón usado en `GoogleLoginButton`:**

```typescript
// 1. Cargar el script GSI una sola vez (idempotente, safe en StrictMode)
useEffect(() => {
  function tryInit(): boolean {
    const gis = (window as any).google?.accounts
    if (gis && !initialized.current) {
      initialized.current = true
      gis.id.initialize({ client_id, callback: handleCredentialResponse, ... })
      return true
    }
    return false
  }

  if (!tryInit()) {
    // Inyectar el script <script src="https://accounts.google.com/gsi/client">
    // y suscribirse a su evento `load`
  }

  // Cleanup: cancelar popup pendiente si el componente se desmonta
  return () => { getGis()?.id.cancel() }
}, [])

// 2. Click en el botón → prompt() muestra el popup
function handleClick() {
  getGis()?.id.prompt((notification) => {
    if (notification.isDismissedMoment?.() || notification.isNotDisplayed?.()) {
      toast({ title: 'Inicio de sesión cancelado', ... })
    }
  })
}

// 3. Callback recibe el id_token JWT
function handleCredentialResponse(response: { credential?: string }) {
  if (!response.credential) return
  authService.loginWithGoogle(response.credential)
    .then(result => login(result.access_token))
    .catch(err => toast({ title: 'Error con Google', ... }))
}
```

**Reglas:**
- El componente es self-contained: NO depende de `<GoogleOAuthProvider>` ni context global.
- Carga el script GSI manualmente con un `id` estable (`google-gsi-client`) para que un segundo componente reutilice la misma carga.
- El `id_token` se envía al backend vía `POST /auth/google` con `{ id_token: <jwt> }`.
- El backend valida con `google.oauth2.id_token.verify_oauth2_token()` y devuelve un `access_token` propio (JWT) que se usa para las llamadas REST siguientes.
- Degradación graciosa: si `VITE_GOOGLE_CLIENT_ID` está vacío, el botón no se renderiza.

**Por qué `@react-oauth/google` queda instalada pero no se usa:** ocupa ~5 KB gzip, se usará en el futuro para refresh tokens o hooks utilitarios. Decisión documentada en ADR-006.
