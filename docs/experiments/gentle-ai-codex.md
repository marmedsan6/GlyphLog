# Experimento: GlyphLog + Codex + Gentle AI

> **Rama:** `experiment/gentle-ai-codex`
> **Versión evaluada:** Gentle AI `v2.5.0-rc.1`
> **Estado:** integración selectiva validada; prueba con una tarea real pendiente
> **Fecha:** 28 de agosto de 2026

## Hipótesis

Gentle AI aportará valor si añade una revisión nativa, acotada y reproducible sin sustituir el conocimiento específico que GlyphLog ya conserva en `AGENTS.md`, skills, Engram, MCPs y documentación SDD.

## Línea base

- Rama de partida: `main` en `91f8cd39e8f9194ae1ab83cb38e9422cf52198bc` (PR #74 fusionada).
- Codex CLI: `0.150.1`.
- Engram: `1.20.0`.
- `AGENTS.md`: 32.939 bytes.
- Instrucciones globales Codex: 1.063 bytes.
- Total potencial de instrucciones: 34.002 bytes, superior al límite por defecto de 32 KiB.
- MCPs ya presentes en el proyecto: Playwright, codebase-memory y Context7.
- Skills existentes: SDD propio, quick context, QA, review estricto, issues, user stories y deploy.

## Prueba aislada del installer

Se descargó el binario oficial Linux amd64 y se verificó contra `SHA256SUMS.txt`:

```text
a82cfd9edbba39b3ebc970ca42df1ce691c3ee7503ac53a24a856b3965ff0991
```

La instalación se ejecutó sobre una copia temporal del repositorio dentro de `bwrap`, con el HOME real oculto. Resultado final: 26 checks correctos, 0 fallos.

Hallazgos relevantes:

1. `--scope workspace` crea backups y estado bajo `~/.gentle-ai` y la integración Engram intenta escribir `~/.codex`.
2. El routing se instala en `.codex/AGENTS.md`, ruta que Codex no usa para las instrucciones de proyecto.
3. El `AGENTS.md` generado ocupa 70.109 bytes; sumado al archivo de GlyphLog aumenta contexto y contradicciones.
4. Las skills se generan en `.codex/skills`, mientras Codex documenta `.agents/skills` para skills de repositorio.
5. `config.toml` contiene rutas absolutas al worktree para instrucciones de Engram, por lo que no es portable.
6. El preset seleccionado generó aproximadamente 295 KB y duplicó Engram/SDD ya existentes.

## Integración elegida

| Pieza                     | Decisión                                 | Motivo                                                                         |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Runner Gentle AI          | Adoptar, fijado a `2.5.0-rc.1` y SHA-256 | Reproducibilidad y rollback                                                    |
| Review nativo / RDD       | Adoptar como skill opt-in                | Es la capacidad diferencial                                                    |
| Routing orgánico          | Integrar resumido en `AGENTS.md`         | Ya encaja con GlyphLog                                                         |
| Multi-agent Codex         | Configurar de forma portable             | Permite pruebas posteriores sin perfiles absolutos                             |
| Persona Gentleman         | No adoptar                               | Tono prescriptivo, gran coste de contexto, no mejora el código por sí mismo    |
| SDD generado              | No adoptar                               | El SDD propio de GlyphLog es más corto y está adaptado a sus specs/test design |
| Engram/Context7 generados | No adoptar                               | Ya existen; instalarlos otra vez crea duplicación y escrituras globales        |
| `.codex/AGENTS.md`        | No adoptar                               | Codex no lo descubre como project instructions                                 |
| Perfiles de modelo        | No adoptar por ahora                     | Son política global/coste y no son necesarios para validar el workflow         |
| Temas/logos/otros agentes | No adoptar                               | Fuera del objetivo Codex-only                                                  |

## Cambios del experimento

- `AGENTS.md` se reduce y conserva solo reglas siempre activas.
- `.agents/skills/` expone a Codex adaptadores hacia las skills canónicas de GlyphLog.
- `.agents/skills/gentle-review/` incorpora únicamente el lifecycle de review útil.
- `.codex/config.toml` habilita el subconjunto portable de multi-agent sin rutas de máquina.
- `scripts/gentle-ai.sh` descarga bajo demanda el release fijado, verifica checksum y ejecuta desde una ruta ignorada por Git.
- OpenCode, Cursor, `.mcp.json` y sus skills no se eliminan durante esta fase.

El runner experimental está limitado deliberadamente a Linux amd64. Añadir otra plataforma exige fijar su asset y checksum oficiales, no seleccionar un binario dinámicamente sin verificación.

## Pruebas comparativas

| Dimensión                | Baseline                         | Integración selectiva       | Criterio de éxito                      |
| ------------------------ | -------------------------------- | --------------------------- | -------------------------------------- |
| Instrucciones cargables  | 34.002 bytes potenciales         | 8.904 bytes con capa global | Root `AGENTS.md` bajo 32 KiB           |
| Skills Codex de proyecto | No estaban en path nativo        | 8 adaptadores/skills        | Codex las enumera                      |
| Review transaccional     | No                               | Gentle review opt-in        | Status read-only y lifecycle invocable |
| Portabilidad             | Config global del usuario        | Sin rutas absolutas         | Clone nuevo funciona                   |
| Interferencia            | OpenCode/Cursor existentes       | Sin cambios                 | Diff no los toca                       |
| Mantenimiento            | Reglas duplicadas en `AGENTS.md` | Detalle en skills/docs      | Menos contexto siempre activo          |

### Evidencia ejecutada

- TC-01: el runner devolvió `gentle-ai 2.5.0-rc.1`.
- TC-02: el binario local devolvió el SHA-256 oficial esperado.
- TC-03: un proceso Codex `0.150.1` nuevo, efímero y read-only identificó el heading `# AGENTS.md — GlyphLog` y enumeró `quick-context`, `sdd`, `thermo-nuclear-review` y `gentle-review` sin leer el filesystem durante la respuesta.
- TC-04: RDD figura `off (decided by default)`; el inventario devolvió `status: clean` y el estado Git fue idéntico antes/después.
- TC-05: pasaron `bash -n`, parseo TOML, resolución de todos los adaptadores, Prettier de los documentos nuevos y `git diff --check`.

El proceso Codex nuevo avisó de hooks duplicados entre `~/.codex/hooks.json` y `~/.codex/config.toml`. Es configuración global preexistente, no creada por esta rama, y se deja fuera del experimento para no ampliar su alcance.

## Uso

```bash
bash scripts/gentle-ai.sh version
bash scripts/gentle-ai.sh review mode status --scope clone --cwd "$PWD"
bash scripts/gentle-ai.sh review status --cwd "$PWD"
```

Para probar el lifecycle con mutación de estado, el usuario debe pedir expresamente habilitar RDD para este clon.

`doctor` espera una instalación global completa y por diseño reporta este runner aislado como no instalado. No se usa como gate de este experimento; los checks relevantes son versión, checksum, carga real de Codex y estado read-only del review.

## Rollback

1. Mantener RDD apagado o ejecutar, si fue activado:

   ```bash
   bash scripts/gentle-ai.sh review mode disable --scope clone --cwd "$PWD"
   ```

2. Volver a `main` para abandonar todos los cambios versionados del experimento.
3. El binario local vive en `.gentle-ai/bin/` y está ignorado; puede eliminarse sin afectar el repositorio.
4. No es necesario restaurar `~/.codex`, porque la integración real no ejecuta el installer contra el HOME del usuario.

## Gate de adopción

Adoptar en `main` solo si una tarea real demuestra alguna de estas mejoras sin fricción desproporcionada:

- detecta un defecto relevante que el review actual no detecta;
- produce evidencia de review más reproducible;
- reduce el tiempo de coordinación de una revisión compleja.

Rechazar o reducir la integración si obliga a mantener estado frágil, duplica hallazgos sin mejorar señal o interfiere con los workflows actuales.
