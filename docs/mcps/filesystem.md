# MCP Filesystem — GlyphLog

## ¿Qué es?

El MCP de Filesystem permite al agente de IA realizar operaciones sobre el sistema de archivos del proyecto de forma directa: leer, escribir, mover, copiar, listar directorios y buscar patrones en múltiples archivos simultáneamente.

---

## Propósito en GlyphLog

- Generar scaffolds completos de nuevas features (componente + hook + service + test en un solo paso)
- Reorganizar archivos durante refactors sin perder contenido
- Leer y analizar múltiples archivos relacionados en paralelo para obtener contexto
- Buscar patrones de uso a través de toda la base de código

---

## Instalación y configuración

### Configuración en Zed

Añadir la siguiente configuración en `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "filesystem": {
      "command": {
        "path": "npx",
        "args": [
          "-y",
          "@modelcontextprotocol/server-filesystem",
          "/ruta/al/proyecto/GlyphLog"
        ]
      }
    }
  }
}
```

> Reemplazar `/ruta/al/proyecto/GlyphLog` con la ruta absoluta al directorio raíz del proyecto en el sistema local.

---

## Casos de uso en GlyphLog

### 1. Crear el scaffold de una nueva feature

```
Usa el MCP de Filesystem para crear el scaffold completo de la feature
"gestión de entradas":

- apps/web/src/components/shared/entry-card.tsx (componente vacío con estructura base)
- apps/web/src/hooks/use-entries.ts (hook vacío con estructura base)
- apps/web/src/services/entries-service.ts (service vacío con estructura base)
- apps/web/src/types/entry.ts (interfaces Entry, CreateEntryRequest, UpdateEntryRequest)
- apps/api/app/routers/entries.py (router vacío con estructura base)
- apps/api/app/services/entry_service.py (service vacío con estructura base)
- apps/api/app/repositories/entry_repository.py (repositorio vacío)
- apps/api/app/schemas/entry.py (schemas Pydantic vacíos)
- apps/api/app/models/entry.py (modelo SQLAlchemy vacío)

Seguir los patrones definidos en memory-bank/patterns.md.
```

### 2. Mover y reorganizar archivos durante refactors

```
Usa el MCP de Filesystem para reorganizar los archivos de autenticación:
- Mover apps/web/src/hooks/useAuth.ts a apps/web/src/hooks/use-auth.ts
  (corregir naming convention a kebab-case)
- Actualizar las importaciones en todos los archivos que importen useAuth
```

### 3. Buscar patrones en múltiples archivos

```
Usa el MCP de Filesystem para buscar todos los archivos que:
- Importan directamente desde fetch() en lugar de usar apiClient
- Usan export default en lugar de named exports
- Tienen type: any sin comentario justificando por qué

Listar los archivos encontrados para revisarlos.
```

### 4. Leer contexto de múltiples archivos relacionados

```
Antes de refactorizar el sistema de autenticación, usa el MCP de Filesystem
para leer en paralelo:
- apps/web/src/hooks/use-auth.ts
- apps/web/src/services/auth-service.ts
- apps/web/src/lib/api-client.ts
- apps/api/app/routers/auth.py
- apps/api/app/services/auth_service.py

Así obtendrás el contexto completo antes de proponer cambios.
```

---

## Operaciones disponibles

| Operación | Descripción | Cuándo usarla |
|-----------|-------------|---------------|
| Leer archivo | Obtener el contenido de un archivo | Analizar código antes de modificarlo |
| Escribir archivo | Crear o sobreescribir un archivo | Crear nuevos archivos de scaffold |
| Mover/renombrar | Mover o renombrar un archivo | Corregir nombres, reorganizar estructura |
| Copiar | Duplicar un archivo | Crear variantes o templates |
| Listar directorio | Ver el contenido de una carpeta | Explorar la estructura del proyecto |
| Buscar | Buscar texto o patrones | Encontrar todos los usos de un patrón |

---

## Uso responsable

### Antes de operaciones destructivas

- **Confirmar con el usuario** antes de eliminar archivos o directorios.
- **Hacer un `git status`** antes de mover muchos archivos para tener claridad de los cambios.
- **Nunca sobreescribir** un archivo con contenido de trabajo no commiteado sin confirmación explícita.

### Al mover archivos

Cuando se mueve un archivo, hay que actualizar **todas las importaciones** que lo referencian. El MCP de Filesystem puede buscar las importaciones, pero la actualización debe hacerse conscientemente.

```
Al mover apps/web/src/hooks/use-entries.ts:
1. Buscar todos los archivos que importen desde "hooks/use-entries" o "@/hooks/use-entries"
2. Actualizar cada importación al nuevo path
3. Verificar que no quedan referencias rotas
```

### Operaciones masivas

Para refactors que afecten muchos archivos:
1. Describir el plan completo antes de ejecutar
2. Ejecutar paso a paso con verificación entre cada paso
3. Hacer `git add` y revisar el diff antes del commit
