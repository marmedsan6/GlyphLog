---
name: gentle-review
description: Ejecuta el review nativo y acotado de Gentle AI para un cambio concreto. Usar solo cuando el usuario pida explícitamente Gentle review, RDD o revisión nativa de Gentle.
license: Apache-2.0
metadata:
  source: Gentleman-Programming/gentle-ai
  source-version: 2.5.0-rc.3
  adaptation: GlyphLog Codex anti-corruption experiment
---

# Gentle Review para GlyphLog

Esta skill usa exclusivamente la capa anti-corrupción de `scripts/gentle-ai.sh`; no instala la persona de Gentle, no reemplaza `AGENTS.md` y no invoca el binario directamente.

## Contrato de activación

- Actívala solo por petición explícita para un target concreto.
- Si el target no está claro, pregunta una sola vez y detente.
- Comprueba primero `bash scripts/gentle-ai.sh review mode status --scope clone --cwd <repo>` y `bash scripts/gentle-ai.sh capabilities`.
- Si capabilities o el bundle fallan, informa el código de rechazo y detente: no existe bypass.
- Nunca habilites RDD por tu cuenta. Tras autorización explícita, usa `review mode enable` con `--user-authorized`.
- Una revisión aprobada es evidencia informativa; no autoriza commit, push, PR, merge, release ni despliegue.

## Lifecycle

1. Ejecuta el preflight normalizado:

   ```bash
   bash scripts/gentle-ai.sh adapter status --scope current --cwd <repo>
   ```

   Para commits usa `--scope committed-only --base-ref <ref>`; para commits más worktree usa `--scope workspace-overlay --base-ref <ref>`.

2. Conserva el JSON del adaptador. No reconstruyas `lineage`, `revision`, `target`, scope, inventario ni argumentos.
3. Si `allowed_action` es `step`, ejecuta exactamente una vez:

   ```bash
   bash scripts/gentle-ai.sh adapter step --scope <scope> --cwd <repo> [--base-ref <ref>]
   ```

4. El adaptador valida y ejecuta los tokens ordenados de `next_transition.execute` como argv, nunca mediante shell.
5. Para una transición `collect`, usa solo el contexto inmutable y la operación descritos por el provider; vuelve a consultar el mismo status. No sustituyas el target por el worktree vivo, `HEAD` u otro diff.
6. Una captura vacía, inválida o incompleta no es aprobación. Reconsulta el status ligado y reintenta solo si vuelve a ofrecer el mismo slot.
7. Un acknowledgement es una transición independiente. Ante resultado incierto, reconsulta status; nunca lo reproduzcas manualmente.
8. Cuando el lifecycle termine, ejecuta las validaciones ordinarias de GlyphLog.

## Seguridad y rollback

- No ejecutes `gentle-ai install` ni el binario de `.gentle-ai/bin/` directamente.
- No copies candidatos fuera del repositorio; usa la inspección inmutable del provider.
- Si el adaptador devuelve `stopped` o un rechazo, conserva `code`, `operation`, `scope`, `lineage`, `allowed_action` y `provider_mutated`, y detente.
- Para desactivar RDD tras petición explícita:

  ```bash
  bash scripts/gentle-ai.sh review mode disable --scope clone --cwd <repo> --user-authorized
  ```

## Resultado

Informa target, estado terminal, findings con evidencia, correcciones realizadas, validaciones de GlyphLog y cualquier degradación del provider. Nunca presentes el resultado como permiso de entrega.
