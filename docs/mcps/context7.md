# MCP Context7 — GlyphLog

## ¿Qué es?

Context7 es un MCP que inyecta documentación actualizada y específica de versión de librerías directamente en el prompt del agente de IA. En lugar de depender de datos de entrenamiento obsoletos o APIs alucinadas, el agente obtiene ejemplos de código y referencias de API directamente de la fuente oficial.

## Propósito en GlyphLog

- **Evitar APIs alucinadas** al escribir código con FastAPI, SQLAlchemy, Pydantic, React, Tailwind, shadcn/ui
- **Reducir correcciones** por usar APIs que cambiaron en versiones recientes
- **Ahorrar tokens** al no tener que buscar en la web o adivinar firmas de funciones
- **Acelerar el desarrollo** con ejemplos de código actualizados y específicos de versión

## Instalación y configuración

### Configuración en opencode.json

Añadir la siguiente entrada en `opencode.json`:

```json
"mcp": {
  "context7": {
    "type": "remote",
    "url": "https://mcp.context7.com/mcp",
    "enabled": true
  }
}
```

### API Key (opcional, para mayor rate limit)

1. Registrarse en https://context7.com/dashboard
2. Obtener una API key
3. Añadir el header en `opencode.json`:

```json
"context7": {
  "type": "remote",
  "url": "https://mcp.context7.com/mcp",
  "headers": {
    "CONTEXT7_API_KEY": "tu-api-key"
  },
  "enabled": true
}
```

### Instalación interactiva (alternativa)

```bash
npx ctx7 setup --opencode --mcp --yes
```

Requiere autenticación OAuth en navegador.

---

## Cómo usarlo

### En prompts del agente

Añade `use context7` a cualquier prompt que involucre APIs de librerías:

```
Crea un middleware de FastAPI que valide JWT. use context7
```

```
Implementa un formulario con react-hook-form y validación zod. use context7
```

```
Configura una migración de Alembic que añada una columna. use context7
```

### Librerías soportadas en GlyphLog

| Librería | ID (si se necesita explícito) |
|----------|------|
| FastAPI | `/fastapi/fastapi` |
| SQLAlchemy | `/sqlalchemy/sqlalchemy` |
| Pydantic | `/pydantic/pydantic` |
| Alembic | — |
| React | `/reactjs/react.dev` |
| Tailwind CSS | `/tailwindlabs/tailwindcss` |
| shadcn/ui | `/shadcn-ui/ui` |
| TypeScript | `/microsoft/TypeScript` |
| Vitest | `/vitest-dev/vitest` |
| Axios | `/axios/axios` |

### Resolución automática

Context7 resuelve automáticamente la librería por el contexto del prompt. Solo usa el ID explícito si la resolución automática falla:

```
use context7 with /fastapi/fastapi for dependency injection examples
```

---

## Cuándo usarlo

- **Siempre que escribas código que use una API de librería externa**
- Cuando no estés seguro de la firma actual de una función
- Cuando los datos de entrenamiento puedan estar desactualizados
- Al implementar features que usan múltiples librerías

## Cuándo NO usarlo

- Para explorar el código del propio proyecto (usa `codebase-memory-mcp`)
- Para recordar decisiones pasadas (usa `engram`)
- Para testing E2E (usa `playwright`)

---

## Referencias

- [Documentación oficial de Context7](https://context7.com/docs)
- [Guía de instalación para opencode](https://context7.com/docs/clients/opencode)
- [Dashboard de API keys](https://context7.com/dashboard)
