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

---

## 10. Patrón: Integración con LLMs (Claude/GPT/Gemini)

### Contexto

GlyphLog integra Claude Sonnet 4.5 (AWS Bedrock) para dos features de IA:
1. **Recomendaciones personalizadas**: Analiza la colección y sugiere nuevas entradas
2. **Importación inteligente**: Parsea listas externas (MAL, AniList, texto libre)

Este patrón establece la arquitectura estándar para integrar LLMs en el proyecto.

### Principios generales

1. **Un servicio por feature de IA**: No mezclar lógica de negocio con lógica de IA
2. **Prompt engineering estructurado**: Formato consistente con role, task, instructions, output format
3. **Structured output forzado**: JSON schema validation obligatorio
4. **Timeout y retry agresivos**: LLMs son lentos e inestables
5. **Error handling granular**: Diferentes errores para diferentes causas
6. **UI transparente**: Disclaimer prominente con modelo, costo, tiempo estimado

### Arquitectura de un servicio de IA

#### 1. Servicio dedicado

**Patrón:**
```python
# apps/api/app/services/recommendation_service.py

class RecommendationService:
    """Servicio para generar recomendaciones personalizadas con Claude."""

    def __init__(
        self,
        bedrock_client: BedrockClient,          # Cliente LLM
        entry_repository: EntryRepository,      # Acceso a datos
        external_search_service: ExternalSearchService,  # Enriquecimiento
    ):
        self.bedrock_client = bedrock_client
        self.entry_repository = entry_repository
        self.external_search_service = external_search_service

    async def generate_recommendations(
        self, user_id: UUID, entry_type: EntryType | None = None, limit: int = 10
    ) -> GenerateRecommendationsResponse:
        """
        Genera recomendaciones personalizadas usando Claude.
        
        Flujo:
        1. Obtener colección del usuario
        2. Calcular metadata
        3. Construir prompt estructurado
        4. Invocar Claude
        5. Validar respuesta con Pydantic
        6. Enriquecer con APIs externas
        7. Devolver response estructurado
        """
        # ... implementación
```

**Responsabilidades del servicio:**
- Preparar datos de entrada (colección del usuario, filtros)
- Construir prompt con formato estructurado
- Invocar LLM a través del cliente
- Parsear y validar respuesta
- Enriquecer con datos adicionales (opcional)
- Devolver response tipado

**NO responsabilidades del servicio:**
- Autenticación (manejada por el router)
- Logging HTTP (manejado por middleware)
- Rate limiting (manejado por middleware)
- Retry de red (manejado por el cliente)

#### 2. Prompt engineering estructurado

**Patrón:**
```python
def _build_recommendation_prompt(
    self, entries: list, limit: int, entry_type: EntryType | None
) -> str:
    """Construye el prompt para Claude."""
    
    # Formatear datos de entrada
    entries_formatted = "\n".join(
        [f"- {e.title} ({e.type.value}, {e.status.value}, {e.rating}/10)"
         for e in sorted_entries[:30]]
    )
    
    # Calcular métricas
    completion_rate = (completed_count / len(entries)) * 100
    avg_rating = sum(ratings) / len(ratings)
    
    # Construir prompt estructurado
    return f"""<role>You are a recommendation engine for anime/manga/videogames.</role>

<task>
Analyze this user's collection and recommend {limit} new titles that match their taste.
</task>

<input>
USER COLLECTION (sorted by rating DESC):
{entries_formatted}

PATTERNS:
- Completion rate: {completion_rate:.1f}%
- Average rating: {avg_rating:.1f}/10
- Total entries: {len(entries)}
</input>

<instructions>
1. Prioritize titles similar to their highest-rated entries
2. Avoid recommending duplicates from their collection
3. Include genre variety
4. Provide specific reasoning referencing their rated titles
</instructions>

<output_format>
Return ONLY a JSON array with this structure (no markdown, no explanation):
[
  {{
    "title": "string",
    "type": "anime" | "manga" | "game",
    "match_percentage": 0-100,
    "reason": "string (explain WHY this matches, reference their titles)",
    "genres": ["string"],
    "similar_to": ["title1", "title2"]
  }}
]
</output_format>"""
```

**Reglas del prompt:**
- Usar tags XML para estructura clara (`<role>`, `<task>`, `<input>`, `<instructions>`, `<output_format>`)
- NO hardcodear ejemplos (excepto para few-shot learning)
- Especificar claramente el formato de output (JSON, markdown, texto)
- Incluir límites numéricos cuando apliquen (max 30 entradas, 1-10 rating)
- Limitar tamaño de input (máximo ~50k chars para no exceder context window)

#### 3. Structured output forzado (JSON mode)

**Con AWS Bedrock (Claude):**
```python
# apps/api/app/integrations/bedrock/client.py

def invoke_json(
    self,
    prompt: str,
    temperature: float = 0.7,
    system: str | None = None,
) -> dict[str, Any] | list[Any]:
    """Invoca el modelo y parsea la respuesta como JSON."""
    
    # 1. Invocar Claude
    response_text = self.invoke(prompt, temperature, system)
    
    # 2. Intentar extraer JSON si viene envuelto en markdown
    if "```json" in response_text:
        json_start = response_text.find("```json") + 7
        json_end = response_text.find("```", json_start)
        response_text = response_text[json_start:json_end].strip()
    elif "```" in response_text:
        json_start = response_text.find("```") + 3
        json_end = response_text.find("```", json_start)
        response_text = response_text[json_start:json_end].strip()
    
    # 3. Parsear JSON
    try:
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"Error al parsear JSON: {e}\nRespuesta: {response_text[:500]}")
        raise ValueError(f"La respuesta no es JSON válido: {e}")
```

**Con OpenAI (GPT-4):**
```python
# Usar response_format con JSON mode (GPT-4 Turbo+)
response = openai.ChatCompletion.create(
    model="gpt-4-turbo",
    messages=[...],
    response_format={"type": "json_object"}
)
```

**Validación con Pydantic:**
```python
# apps/api/app/schemas/recommendation.py

class Recommendation(BaseModel):
    """Recomendación generada por Claude."""
    
    title: str = Field(..., description="Título de la obra")
    type: EntryType = Field(..., description="Tipo de entrada")
    match_percentage: int = Field(..., ge=0, le=100)
    reason: str = Field(..., min_length=10, description="Razón explicativa")
    genres: list[str] = Field(default_factory=list)
    similar_to: list[str] = Field(default_factory=list)
    
    # Campos opcionales (enriquecidos después)
    year: int | None = Field(None, ge=1900, le=2100)
    external_url: str | None = None
    cover_image_url: str | None = None
```

**En el servicio:**
```python
recommendations_data = bedrock_client.invoke_json(prompt=prompt, temperature=0.8)

if not isinstance(recommendations_data, list):
    raise ValueError("Claude no devolvió un array JSON")

# Validar cada recomendación
recommendations: list[Recommendation] = []
for item in recommendations_data[:limit]:
    try:
        rec = Recommendation(**item)  # Pydantic valida
        recommendations.append(rec)
    except Exception as e:
        logger.warning(f"Error al validar recomendación: {e}")
        # Descartar recomendación inválida, continuar con las demás
```

#### 4. Timeout y retry

**Cliente con retry automático:**
```python
# apps/api/app/integrations/bedrock/client.py

import boto3
from botocore.config import Config

def __init__(self, model_id: str, region: str, max_tokens: int = 4096):
    # Configurar timeout y retry en boto3
    config = Config(
        read_timeout=90,        # 90 segundos para llamadas largas
        connect_timeout=10,     # 10 segundos para conectar
        retries={
            'max_attempts': 2,  # 1 retry
            'mode': 'standard'
        }
    )
    
    self.client = boto3.client(
        service_name="bedrock-runtime",
        region_name=region,
        config=config
    )
```

**Servicio con manejo de timeout:**
```python
async def generate_recommendations(...) -> GenerateRecommendationsResponse:
    try:
        # Invocar con timeout implícito (90s en cliente)
        recommendations_data = self.bedrock_client.invoke_json(
            prompt=prompt,
            temperature=0.8,
        )
        
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ThrottlingException":
            raise HTTPException(status_code=429, detail="Bedrock rate limit alcanzado, reintenta en 1 minuto")
        elif error_code == "ModelTimeoutError":
            raise HTTPException(status_code=504, detail="El modelo tardó demasiado en responder")
        else:
            raise HTTPException(status_code=500, detail=f"Error de Bedrock: {error_code}")
    
    except ValueError as e:
        # JSON inválido
        raise HTTPException(status_code=500, detail=f"Respuesta inválida del modelo: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error inesperado: {e}")
        raise HTTPException(status_code=500, detail="Error interno al generar recomendaciones")
```

#### 5. Error handling granular

**Jerarquía de errores:**
```python
# apps/api/app/exceptions.py

class AIServiceError(Exception):
    """Error base para servicios de IA."""
    pass

class InsufficientDataError(AIServiceError):
    """Datos insuficientes para generar respuesta (ej: <5 entradas)."""
    pass

class ModelTimeoutError(AIServiceError):
    """El modelo LLM tardó demasiado en responder."""
    pass

class InvalidResponseError(AIServiceError):
    """La respuesta del modelo no cumple con el schema esperado."""
    pass

class RateLimitError(AIServiceError):
    """Rate limit del proveedor de LLM alcanzado."""
    pass
```

**En el servicio:**
```python
if len(entries) < 5:
    raise InsufficientDataError("Se requieren al menos 5 entradas para generar recomendaciones")
```

**En el router:**
```python
# apps/api/app/routers/recommendations.py

@router.post("/generate", response_model=GenerateRecommendationsResponse)
async def generate_recommendations(
    request: GenerateRecommendationsRequest,
    current_user: User = Depends(get_current_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    try:
        return await service.generate_recommendations(
            user_id=current_user.id,
            entry_type=request.type,
            limit=request.limit
        )
    
    except InsufficientDataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except ModelTimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    
    except InvalidResponseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
```

#### 6. UI para features de IA

**Disclaimer prominente:**
```tsx
// apps/web/src/pages/recommendations/recommendations.page.tsx

<Alert className="mb-6">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    Este sistema usa <strong>Claude Sonnet 4.5</strong> en AWS Bedrock y 
    consume aproximadamente <strong>30-50k tokens</strong> por generación.
    El análisis puede tardar entre <strong>30-60 segundos</strong>.
  </AlertDescription>
</Alert>
```

**Loading state descriptivo:**
```tsx
<Button onClick={handleGenerate} disabled={isPending}>
  <Sparkles className="mr-2 h-4 w-4" />
  {isPending 
    ? 'Claude está analizando tu colección...' 
    : 'Generar recomendaciones'}
</Button>
```

**Toast de error con contexto:**
```tsx
onError: (error) => {
  const message = getApiErrorMessage(error)
  
  if (message.includes('menos de 5 entradas')) {
    toast({
      title: 'Colección insuficiente',
      description: 'Añade al menos 5 entradas a tu colección para obtener recomendaciones personalizadas.',
      variant: 'destructive',
    })
  } else if (message.includes('timeout')) {
    toast({
      title: 'El análisis tardó demasiado',
      description: 'Claude no respondió a tiempo. Inténtalo nuevamente.',
      variant: 'destructive',
    })
  } else {
    toast({
      title: 'Error al generar recomendaciones',
      description: message,
      variant: 'destructive',
    })
  }
}
```

**Empty state invitando a acción:**
```tsx
{!result && !isPending && (
  <Card>
    <CardContent className="flex min-h-[400px] items-center justify-center p-8">
      <div className="text-center">
        <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">
          Genera tu primera recomendación personalizada
        </h3>
        <p className="text-sm text-muted-foreground">
          Configura los filtros arriba y haz clic en "Generar recomendaciones" para comenzar.
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

### Ejemplo completo: RecommendationService

Ver implementación de referencia:
- **Backend**: `apps/api/app/services/recommendation_service.py`
- **Cliente Bedrock**: `apps/api/app/integrations/bedrock/client.py`
- **Schemas**: `apps/api/app/schemas/recommendation.py`
- **Router**: `apps/api/app/routers/recommendations.py`
- **Frontend**: `apps/web/src/pages/recommendations/recommendations.page.tsx`

### Anti-patrones

**NO hacer:**

1. **Llamar LLM desde el router:**
   ```python
   # ❌ MAL - Router con lógica de IA
   @router.post("/generate")
   async def generate_recommendations(...):
       prompt = f"Recommend me anime: {entries}"
       response = bedrock_client.invoke(prompt)
       return response
   ```
   
   **Por qué:** Mezcla responsabilidades, difícil testear, no reutilizable

2. **Prompt hardcodeado sin variables:**
   ```python
   # ❌ MAL - Prompt estático
   prompt = "Recommend me 10 anime similar to Attack on Titan"
   ```
   
   **Por qué:** No personalizado, no escalable, no reutilizable

3. **Asumir response válido sin validación:**
   ```python
   # ❌ MAL - No validar respuesta
   recommendations_data = bedrock_client.invoke_json(prompt)
   return recommendations_data  # Puede estar malformado
   ```
   
   **Por qué:** Propagará errores al frontend, exposición de datos inválidos

4. **UI sin disclaimer:**
   ```tsx
   {/* ❌ MAL - Botón sin contexto */}
   <Button onClick={generate}>Generate AI recommendations</Button>
   ```
   
   **Por qué:** Usuario no sabe qué esperar (tiempo, costo, modelo)

5. **Timeout excesivo (>90s):**
   ```python
   # ❌ MAL - Timeout muy largo
   config = Config(read_timeout=300)  # 5 minutos
   ```
   
   **Por qué:** Mala UX, probablemente indica problema en el modelo

6. **Reintentar infinitamente:**
   ```python
   # ❌ MAL - Retry sin límite
   while True:
       try:
           return bedrock_client.invoke(prompt)
       except:
           continue
   ```
   
   **Por qué:** Puede agotar límites de rate, costo descontrolado

### Cuándo usar LLMs

**Usar LLMs para:**
- Análisis de texto complejo (sentimiento, intención, clasificación multi-etiqueta)
- Generación de contenido personalizado (recomendaciones, resúmenes)
- Parsing de formatos no estructurados (listas de texto libre, capturas de pantalla)
- Razonamiento que requiere conocimiento del mundo (géneros de anime, similitud de juegos)

**NO usar LLMs para:**
- Cálculos matemáticos simples (suma, promedio, porcentajes)
- Queries a base de datos (usar SQL directamente)
- Validaciones de formato (usar regex o Pydantic)
- Features tiempo-real (<1s de latencia)
- Operaciones deterministas (sorting, filtering)

### Referencias

- **ADR-012**: Sistema de Recomendaciones con Claude Sonnet 4.5 (`memory-bank/decisions.md`)
- **Documentación completa**: `docs/features/recommendations.md`
- **Claude API Reference**: https://docs.anthropic.com/en/api/
- **AWS Bedrock Documentation**: https://docs.aws.amazon.com/bedrock/
- **Prompt Engineering Guide**: https://www.promptingguide.ai/
