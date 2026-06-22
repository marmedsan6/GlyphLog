# MCP Git — GlyphLog

## ¿Qué es?

El MCP de Git permite al agente de IA interactuar con el repositorio Git del proyecto: ver el estado del working tree, analizar el historial de commits, comparar cambios, inspeccionar la autoría de código y obtener contexto histórico antes de ejecutar operaciones.

---

## Propósito en GlyphLog

- Obtener contexto de qué cambió en la última sesión de trabajo antes de continuar
- Analizar el historial de un archivo o función para entender su evolución
- Prepararse para un refactor revisando qué código toca cada área
- Verificar el estado del working tree antes de hacer commit

---

## Instalación y configuración

### Configuración en Zed

El MCP de Git en Zed normalmente está disponible como parte de las capacidades del agente sin configuración adicional. Si es necesario configurarlo explícitamente:

```json
{
  "context_servers": {
    "git": {
      "command": {
        "path": "npx",
        "args": ["-y", "@modelcontextprotocol/server-git", "/ruta/al/proyecto/GlyphLog"]
      }
    }
  }
}
```

> Reemplazar `/ruta/al/proyecto/GlyphLog` con la ruta absoluta al directorio raíz del proyecto.

---

## Casos de uso en GlyphLog

### 1. Ver qué cambió en la última sesión de trabajo

```
Usa el MCP de Git para obtener contexto de la última sesión:
- Muestra el log de los últimos 10 commits con fecha y mensaje
- Muestra el diff de los últimos 2 commits para entender qué se hizo
```

### 2. Analizar el historial de un archivo

```
Antes de refactorizar apps/api/app/services/entry_service.py,
usa el MCP de Git para:
- Ver el historial de commits que tocaron ese archivo
- Mostrar qué cambios se hicieron en los últimos 3 commits que lo modificaron
```

### 3. Obtener contexto antes de un refactor

```
Voy a refactorizar el sistema de autenticación. Usa el MCP de Git para:
- Listar todos los archivos que han sido modificados en los últimos 5 commits
  relacionados con "auth" en el mensaje
- Mostrar qué líneas cambiaron en apps/api/app/routers/auth.py en el último commit
```

### 4. Verificar el estado del working tree

```
Usa el MCP de Git para mostrar:
- El estado actual del working tree (git status)
- Los archivos con cambios no commiteados
- Si hay cambios en staging que no se han commiteado aún
```

---

## Comandos útiles

El MCP de Git expone las operaciones más comunes de Git como herramientas del agente:

| Operación | Descripción | Ejemplo de uso |
|-----------|-------------|----------------|
| `git status` | Estado del working tree | Ver qué archivos han cambiado |
| `git log` | Historial de commits | Ver los últimos N commits con mensajes |
| `git diff` | Diferencias entre versiones | Ver qué cambió en un archivo |
| `git show` | Contenido de un commit | Inspeccionar un commit específico |
| `git blame` | Autoría línea por línea | Saber quién/cuándo escribió cada línea |

---

## Convenciones de commits en GlyphLog

GlyphLog usa el formato **Conventional Commits** para todos los mensajes de commit.

### Formato

```
tipo(scope): descripción corta en imperativo

[cuerpo opcional — explicación del por qué]

[footer opcional — referencias a issues, breaking changes]
```

### Tipos válidos

| Tipo | Cuándo usarlo |
|------|--------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Mejora interna sin cambio de comportamiento observable |
| `docs` | Solo cambios en documentación |
| `setup` | Configuración de entorno o infraestructura |
| `test` | Añadir o corregir tests |
| `chore` | Tareas de mantenimiento (deps, CI, scripts, etc.) |

### Scopes habituales en GlyphLog

| Scope | Área |
|-------|------|
| `api` | Backend FastAPI |
| `web` | Frontend React |
| `db` | Base de datos, migraciones |
| `docker` | Configuración de Docker |
| `ci` | Pipelines de CI/CD |
| `deps` | Actualización de dependencias |

### Ejemplos de commits correctos

```bash
feat(api): add entry creation endpoint with pydantic validation
fix(web): correct status filter not resetting on type change
refactor(api): extract entry validation logic to separate service method
docs: update AGENTS.md with new MCP configuration instructions
setup(docker): add healthcheck to postgres service in docker-compose
test(api): add unit tests for EntryService.create method
chore(deps): update fastapi to 0.111.0
```

### Ejemplos de commits incorrectos

```bash
# Demasiado vago
fix: bug fix

# En pasado en lugar de imperativo
feat(web): added login form

# Sin scope cuando el alcance es claro
refactor: clean up entry service
```
