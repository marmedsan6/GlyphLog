# MCP Playwright — GlyphLog

## ¿Qué es?

El MCP de Playwright permite al agente de IA controlar un navegador web de forma programática: navegar a URLs, hacer clicks, rellenar formularios, tomar capturas de pantalla y verificar el contenido de la página. Es la herramienta principal para testing end-to-end y validación de flujos de usuario.

---

## Propósito en GlyphLog

Usar el MCP de Playwright para validar que los flujos críticos de usuario funcionan correctamente de forma integral, desde el frontend hasta la base de datos:

- Verificar el flujo completo de registro y login
- Verificar que se puede crear una entrada en la colección y que aparece correctamente
- Verificar que el logout funciona y protege las rutas privadas
- Detectar regresiones visuales o funcionales en features existentes

Es especialmente útil al final de una sesión de desarrollo para confirmar que la feature implementada funciona en el navegador real.

---

## Instalación y configuración

### Configuración en Zed

Añadir la siguiente configuración en `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "playwright": {
      "command": {
        "path": "npx",
        "args": ["-y", "@executeautomation/playwright-mcp-server"],
        "env": {
          "PLAYWRIGHT_BASE_URL": "http://localhost:5173"
        }
      }
    }
  }
}
```

### Requisito previo

El MCP de Playwright necesita que **la aplicación esté levantada y accesible** antes de usarlo. Levantar el entorno de desarrollo con:

```bash
# Desde la raíz del monorepo
pnpm dev

# O con Docker Compose
docker compose up -d
```

### Variable de entorno

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5173` | URL base del frontend en desarrollo |

---

## Casos de uso en GlyphLog

### 1. Verificar que el login funciona correctamente

```
Usa Playwright para verificar que el flujo de login funciona:
1. Navega a http://localhost:5173/login
2. Rellena el campo email con "test@example.com"
3. Rellena el campo password con "password123"
4. Haz click en el botón "Iniciar sesión"
5. Verifica que la URL cambia a /dashboard
6. Verifica que aparece el nombre del usuario en el header
```

### 2. Verificar que se puede crear una entrada

```
Usa Playwright para verificar el flujo de creación de entrada:
1. Asegúrate de estar logueado
2. Navega a /collection
3. Haz click en "Nueva entrada"
4. Rellena el título con "Attack on Titan"
5. Selecciona el tipo "anime"
6. Selecciona el estado "completed"
7. Haz click en "Guardar"
8. Verifica que la entrada aparece en la lista de la colección
```

### 3. Verificar que el logout funciona

```
Usa Playwright para verificar el logout:
1. Asegúrate de estar logueado
2. Haz click en el menú de usuario
3. Haz click en "Cerrar sesión"
4. Verifica que la URL cambia a /login
5. Intenta navegar a /collection directamente
6. Verifica que redirige a /login (ruta protegida)
```

---

## Comandos principales del MCP

Una vez configurado, el agente puede usar los siguientes tipos de operaciones:

| Operación | Descripción | Ejemplo |
|-----------|-------------|---------|
| Navegar | Ir a una URL | `playwright_navigate url="http://localhost:5173/login"` |
| Click | Hacer click en un elemento | `playwright_click selector=".btn-login"` |
| Rellenar | Escribir en un campo | `playwright_fill selector="#email" value="user@email.com"` |
| Verificar texto | Comprobar que un texto existe | `playwright_get_visible_text` |
| Captura de pantalla | Fotografiar el estado actual | `playwright_screenshot` |
| Evaluar JS | Ejecutar JavaScript en la página | `playwright_evaluate script="..."` |

---

## Cómo pedirle al agente que use Playwright

Ser explícito al solicitar el uso del MCP:

```
Usa el MCP de Playwright para verificar que la feature de login funciona.
La app está corriendo en http://localhost:5173.
Credenciales de prueba: email=test@glyphlog.dev, password=test1234
```

```
Antes de dar la tarea por terminada, usa Playwright para hacer un smoke test
del flujo completo: login → crear entrada → ver colección → logout.
```

---

## Consideraciones

- **La app debe estar corriendo.** El MCP no levanta la aplicación. Asegurarse de que `pnpm dev` o `docker compose up` están activos antes de usar Playwright.
- **Estado de la base de datos.** Los tests de Playwright crean datos reales en la base de datos de desarrollo. Si es necesario, limpiar los datos de test manualmente o usar el MCP de PostgreSQL para hacerlo.
- **Credenciales de test.** Definir en el `.env` local un usuario de prueba dedicado para los tests E2E. No usar credenciales de producción.
- **Entorno local vs CI.** El MCP de Playwright está pensado para uso en desarrollo local. Para CI, configurar Playwright directamente en el pipeline de GitHub Actions.
