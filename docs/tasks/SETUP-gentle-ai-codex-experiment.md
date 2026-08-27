# [SETUP] Integración experimental de Codex con Gentle AI

> **Estado:** completada
> **Prioridad:** media
> **Dependencias:** ninguna

## Contexto

GlyphLog ya dispone de `AGENTS.md`, MCPs, Engram, SDD, skills de proyecto y convenciones de revisión. Gentle AI v2.5.0-rc.1 añade un lifecycle nativo de review y distribución coordinada de skills, pero su instalación Codex workspace también duplica capacidades y genera artefactos no portables.

## Objetivo

Crear una integración de prueba, aislada y reversible que permita medir el review nativo de Gentle AI desde Codex sin reemplazar las reglas específicas de GlyphLog ni afectar a OpenCode/Cursor.

## Especificación

N/A. Experimento de tooling sin comportamiento de producto.

## Test design

N/A. Se valida mediante checks de configuración, carga de skills, versión/checksum del runner, estado read-only del review y comparación con la línea base.

### Matriz de automatización

| Caso  | Validación prevista                                                 | Nivel       |
| ----- | ------------------------------------------------------------------- | ----------- |
| TC-01 | `bash scripts/gentle-ai.sh version` devuelve `2.5.0-rc.1`           | smoke       |
| TC-02 | SHA-256 del binario coincide con el release oficial                 | integridad  |
| TC-03 | Codex descubre `AGENTS.md`, `.codex/config.toml` y `.agents/skills` | integración |
| TC-04 | `review mode status` y `review status` no mutan el repositorio      | integración |
| TC-05 | `git diff --check` y validadores de Markdown/TOML/shell pasan       | estático    |

## Decisiones de Plan mode

- **Enfoque técnico:** adoptar un subconjunto portable, no ejecutar el instalador directamente en el HOME real.
- **Capas afectadas:** configuración y workflows de agentes; no se modifica código de producto.
- **Dependencias y orden:** runner fijado → skills Codex → AGENTS compacto → validación → publicación.
- **Riesgos y mitigaciones:** RC inestable, escrituras globales y duplicación; se mitigan con checksum, scope de repositorio, opt-in y rollback Git.
- **Archivos previstos:** `AGENTS.md`, `.codex/`, `.agents/skills/`, `scripts/gentle-ai.sh`, documentación y ADR.

## Tareas técnicas

- [x] Publicar y fusionar la rama de Companion antes de iniciar el experimento.
- [x] Crear `experiment/gentle-ai-codex` desde `origin/main`.
- [x] Ejecutar el installer en una caja desechable y capturar sus artefactos.
- [x] Reducir `AGENTS.md` y exponer las skills existentes en el path nativo de Codex.
- [x] Añadir un runner reproducible fijado a v2.5.0-rc.1.
- [x] Adaptar el review nativo de Gentle a las políticas de GlyphLog.
- [x] Ejecutar TC-01..TC-05 y documentar evidencia.
- [x] Publicar la rama experimental.

## Criterios de aceptación

- ✅ La rama nace del `main` que contiene la PR #74.
- ✅ Gentle AI puede ejecutarse sin instalación global permanente.
- ✅ El runner verifica el artefacto antes de ejecutarlo.
- ✅ No se reemplazan las configuraciones de OpenCode/Cursor.
- ✅ Las instrucciones del proyecto caben en el límite normal de Codex.
- ✅ RDD permanece deshabilitado salvo petición explícita.
- ✅ Existe un procedimiento de rollback documentado.

## Notas técnicas

La prueba del instalador oficial se ejecutó con `bwrap`, un HOME falso y una copia temporal del repositorio. El installer completó 26/26 checks solo tras proporcionar un `hooks.json` global simulado; este comportamiento confirma que `--scope workspace` no evita todas las escrituras globales.

## Archivos relevantes

- `AGENTS.md`
- `.codex/config.toml`
- `.agents/skills/`
- `scripts/gentle-ai.sh`
- `docs/experiments/gentle-ai-codex.md`
- `memory-bank/decisions.md`
