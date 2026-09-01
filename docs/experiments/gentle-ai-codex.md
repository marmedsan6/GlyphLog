# Experimento: GlyphLog + Codex + Gentle AI rc.3

> **Rama:** `experiment/gentle-ai-codex-rc3`
> **Base:** `main` en `91f8cd39e8f9194ae1ab83cb38e9422cf52198bc`
> **Versión evaluada:** Gentle AI `v2.5.0-rc.3`
> **Estado:** integración fail-closed implementada; adopción y benchmark bloqueados
> **Fecha:** 31 de agosto de 2026

## Resultado

rc.3 no es adoptable con los artefactos publicados. El binario y sus capabilities son coherentes, pero el bundle contractual contradice la propia release y no permite validar las continuaciones que el consumidor debe ejecutar literalmente. La capa anti-corrupción se conserva como evidencia experimental y rechaza el provider antes de iniciar o mutar una revisión.

No se habilitó RDD, no se ejecutó `gentle-ai install`, no se inició una revisión real y no se tocó código de las aplicaciones.

## Portado selectivo

- La rama nace de `main`; `experiment/gentle-ai-codex` permanece intacta en `b63e55a` como evidencia rc.1/#68.
- Se portaron el `AGENTS.md` compacto y ocho adaptadores bajo `.agents/skills/`.
- No se portaron código, fixtures, docs de Companion ni E2E de #68.
- No se añadió `.codex/config.toml`: el lifecycle rc.3 identifica `codex` mediante `--agent` y no necesita perfiles, rutas absolutas ni configuración global.
- OpenCode, Cursor, SDD, QA, Engram, codebase-memory y Playwright permanecen sin reemplazo.

## Integridad y capabilities

| Comprobación        | Esperado                                                                             | Observado                            |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| Binario Linux amd64 | SHA-256 `b69da0a5…bd87`                                                              | coincide                             |
| Versión             | `2.5.0-rc.3`                                                                         | coincide                             |
| Contrato            | `gentle-ai.review-integration/v2`                                                    | coincide                             |
| Capabilities        | `v2.3`, protocol `2.3`                                                               | coincide                             |
| Schemas anunciados  | `start/v4`, `status/v5`                                                              | coinciden                            |
| Runtime del bundle  | `codex` registrado                                                                   | coincide                             |
| Features            | `native_next_transition`, `opaque_repository_context`, `provider_artifact_admission` | soportadas                           |
| Bundle              | SHA-256 `1acabf9c…feb85b` y schemas completos                                        | hash coincide; inventario incompleto |

### Gate bloqueante del bundle

La release afirma que el bundle contiene el conjunto completo de schemas, incluidos los de transición y los pares nuevos. El tarball oficial solo contiene:

```text
schemas/lens.schema.json
schemas/refuter.schema.json
schemas/targeted-validator.schema.json
```

Faltan, como mínimo:

```text
schemas/transition-execution.schema.json
schemas/start-v4.schema.json
schemas/capabilities-v2.3.schema.json
schemas/status-v5.schema.json
```

`bash scripts/gentle-ai.sh capabilities` devuelve `bundle_inventory_incomplete` con exit 2. `adapter status`, `adapter step` y `review mode enable` heredan el mismo gate. No hay flag de bypass.

## Capa anti-corrupción

El único punto público es `bash scripts/gentle-ai.sh`:

```bash
bash scripts/gentle-ai.sh version
bash scripts/gentle-ai.sh capabilities
bash scripts/gentle-ai.sh adapter status --scope current --cwd "$PWD"
bash scripts/gentle-ai.sh adapter status --scope committed-only --base-ref main --cwd "$PWD"
bash scripts/gentle-ai.sh adapter status --scope workspace-overlay --base-ref main --cwd "$PWD"
bash scripts/gentle-ai.sh adapter step --scope current --cwd "$PWD"
```

La administración de RDD está separada. `enable` y `disable` exigen petición explícita y el marcador `--user-authorized`; `enable` además exige que el contrato pase:

```bash
bash scripts/gentle-ai.sh review mode status --scope clone --cwd "$PWD"
bash scripts/gentle-ai.sh review mode enable --scope clone --cwd "$PWD" --user-authorized
```

El adaptador:

- fija versión, hashes, contrato, protocolo, schemas y features;
- admite solo `current`, `committed-only` y `workspace-overlay`;
- persiste scope, target, lineage, revision e inventario bajo `.gentle-ai/adapter/`;
- compara el comando renderizado con los tokens ordenados y ejecuta una lista argv contra el binario local verificado;
- rechaza drift, schema desconocida, tokens/comandos alterados y replay mutante;
- trata el acknowledgement como transición propia;
- normaliza nueve estados y emite rechazos con operación, scope, lineage, acción permitida y resultado de mutación.

Gentle sigue siendo informativo: ningún estado autoriza commit, push, PR, merge, release o despliegue.

## Evaluación funcional

### Pruebas automatizadas

Los tests cubren fixtures de:

- `disabled`, `not_started`, `reviewing`, `needs_correction`;
- `approved_pending_ack`, `approved`, `rejected`, `stopped`;
- `clean_without_review`.

También cubren schema/protocol desconocido, target y revision drift, scope inválido/cambiado, comando alterado, replay de acknowledgement, inventario untracked incorrecto, bundle incompleto y un repositorio desechable sin escrituras al HOME simulado.

### Smoke real

- `version`: devuelve `gentle-ai 2.5.0-rc.3`.
- `capabilities`: valida primero el binario y después falla cerrado por inventario contractual.
- `review mode status`: devuelve `off (decided by default)`; global y clone-local permanecen `unset`.
- El status selectorless previo a implementar el gate devolvió `status/v5` y `next_transition.stop(rdd_disabled)`.
- Un STATUS real adicional se ejecutó dentro de `bwrap`, sin red, con `/home` de solo lectura y solo un repositorio Git desechable escribible. Devolvió el mismo `status/v5`; el worktree siguió limpio y no creó autoridad ni archivos fuera de `.git`.

### Lifecycle no ejecutado

No se probaron START, current changes mutante, `committed-only`, `workspace-overlay`, continuación, captures, acknowledgement/replay, cambio de binding ni recuperación real. Requieren tanto superar el gate contractual como autorización explícita para habilitar RDD. Presentarlos como validados confundiría pruebas del adaptador con evidencia del provider.

## Benchmark A/B

El diseño queda congelado, pero no se ejecuta mientras falle el contrato:

| Tarea                     | Base      | Referencia oculta posterior  |
| ------------------------- | --------- | ---------------------------- |
| Fix issue #27             | `59d67d`  | `5d242b8`                    |
| Feature issue #67         | `b21f1b0` | `d8e267e`                    |
| Integración E2E issue #68 | `91f8cd3` | `b63e55a`, solo tras puntuar |

Los brazos A/B deben compartir modelo, razonamiento, prompt, presupuesto, base y criterios. Las métricas serán tiempo al primer verde, iteraciones, tests/cobertura, defectos escapados, cambios innecesarios, falsos positivos, tiempo total/específico de Gentle y coste de coordinación. Ninguna implementación del benchmark se fusionará automáticamente.

## Decisión de adopción

El primer gate exige ausencia de fallos de contrato, seguridad y portabilidad. rc.3 lo incumple antes del benchmark, así que:

- no se propone integrar en `main`;
- ADR-020 queda rechazada para esta release;
- ADR-019 conserva el experimento rc.1 y no se marca reemplazada;
- no se retira ninguna herramienta existente;
- los gates de señal, overhead ≤ 25 %, defectos escapados y falsos positivos quedan sin medir.

## Rollback

1. RDD ya está apagado. Si alguna evaluación futura lo habilita con autorización, desactivarlo explícitamente:

   ```bash
   bash scripts/gentle-ai.sh review mode disable --scope clone --cwd "$PWD" --user-authorized
   ```

2. Cambiar a `main` para abandonar los cambios versionados de la rama.
3. Eliminar únicamente `.gentle-ai/` si se desea retirar binario, bundle y estado local; todo es regenerable y Git lo ignora.
4. No hay configuración global que restaurar porque no se ejecutó el installer ni se habilitó RDD.
