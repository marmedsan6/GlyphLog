---
name: gentle-review
description: Ejecuta el review nativo y acotado de Gentle AI para un cambio concreto. Usar solo cuando el usuario pida explícitamente Gentle review, RDD o revisión nativa de Gentle.
license: Apache-2.0
metadata:
  source: Gentleman-Programming/gentle-ai
  source-version: 2.5.0-rc.1
  adaptation: GlyphLog Codex experiment
---

# Gentle Review para GlyphLog

Esta skill adapta el lifecycle nativo de Gentle AI sin instalar su persona, reemplazar `AGENTS.md` ni añadir rutas absolutas.

## Contrato de activación

- Actívala solo por petición explícita para un target concreto.
- Si el target no está claro, pregunta una sola vez y detente.
- Comprueba primero el estado con `bash scripts/gentle-ai.sh review mode status --cwd <repo> --scope clone`.
- Nunca habilites RDD por tu cuenta. Solo ejecuta `review mode enable` tras autorización explícita.
- Una revisión aprobada es evidencia informativa; no autoriza commit, push, PR ni release.

## Lifecycle

1. Ejecuta el preflight de solo lectura:

   ```bash
   bash scripts/gentle-ai.sh review status --cwd <repo>
   ```

2. Si devuelve una transición, conserva literalmente `lineage`, `revision`, `target` y el orden de argumentos.
3. Ejecuta únicamente la operación indicada por `next_transition`; no reconstruyas comandos desde el historial ni desde texto libre.
4. Los revisores inspeccionan el target inmutable emitido por el provider. No sustituyas ese target por el worktree vivo, `HEAD` u otro diff.
5. Una captura vacía, inválida o incompleta no es aprobación. Reconsulta el mismo status ligado y reintenta solo si vuelve a ofrecer ese slot.
6. Gentle AI admite como máximo la corrección acotada que declare su estado. No amplíes el scope ni inventes rondas.
7. Cuando el lifecycle termine, ejecuta las validaciones ordinarias de GlyphLog y deja la entrega bajo la política normal del repositorio.

## Seguridad y rollback

- No ejecutes `gentle-ai install` desde esta skill.
- No copies candidatos a `/tmp` ni a archivos auxiliares; usa la inspección inmutable del provider.
- Si el CLI devuelve un stop o pide intervención humana, conserva su motivo exacto y detente.
- Para desactivar el modo de este clon por petición del usuario:

  ```bash
  bash scripts/gentle-ai.sh review mode disable --scope clone --cwd <repo>
  ```

## Resultado

Informa target, estado terminal, findings con evidencia, correcciones realizadas, validaciones de GlyphLog y cualquier degradación del provider. Nunca presentes el resultado como permiso de entrega.
