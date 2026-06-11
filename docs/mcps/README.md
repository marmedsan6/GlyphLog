# MCPs — GlyphLog

Los **MCPs (Model Context Protocol servers)** son servidores que amplían las capacidades de un agente de IA con acceso a herramientas externas: bases de datos, navegadores, sistemas de archivos, repositorios Git, y más.

---

## MCPs configurados

| MCP | Propósito | Cuándo usarlo | Documentación |
|-----|-----------|---------------|---------------|
| **Playwright** | Automatización de navegador y testing E2E | Validar flujos de usuario complejos, verificar que una feature funciona end-to-end | [playwright.md](./playwright.md) |
| **PostgreSQL** | Consultas directas a la base de datos | Debuggear datos, verificar migraciones, explorar el esquema | [postgresql.md](./postgresql.md) |
| **Filesystem** | Operaciones de sistema de archivos | Refactors de estructura, generación de scaffolds, búsqueda en múltiples archivos | [filesystem.md](./filesystem.md) |
| **Git** | Análisis del repositorio | Revisar historial de cambios, obtener contexto antes de un refactor | [git.md](./git.md) |

---

## Cómo añadir un nuevo MCP al proyecto

1. **Elegir o instalar el servidor MCP.** Muchos MCP servers están disponibles como paquetes npm o como herramientas standalone. Ver el [registro de MCPs](https://modelcontextprotocol.io/servers) para opciones disponibles.

2. **Configurar el MCP en el cliente de IA.** En Zed, los MCPs se configuran en `~/.config/zed/settings.json` bajo la clave `context_servers`. En Claude Desktop, en el archivo `claude_desktop_config.json`.

   ```json
   // Ejemplo de configuración en Zed settings.json
   {
     "context_servers": {
       "nombre-del-mcp": {
         "command": {
           "path": "npx",
           "args": ["-y", "@nombre/mcp-server"],
           "env": {
             "VARIABLE": "valor"
           }
         }
       }
     }
   }
   ```

3. **Crear la documentación del MCP** en este directorio siguiendo la estructura de los archivos existentes. Incluir: propósito, casos de uso en GlyphLog, configuración y ejemplos.

4. **Añadir el MCP a la tabla** de este README.

5. **Actualizar `AGENTS.md`** en la sección de MCPs disponibles si el nuevo MCP es relevante para el flujo de trabajo habitual.

---

## Documentación oficial

- [Model Context Protocol — Documentación oficial](https://modelcontextprotocol.io)
- [Especificación del protocolo](https://spec.modelcontextprotocol.io)
- [Registro de MCP servers disponibles](https://modelcontextprotocol.io/servers)
- [Guía de configuración en Zed](https://zed.dev/docs/ai/mcp)
