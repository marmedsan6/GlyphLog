# [SETUP] Evaluación aislada de Gentle AI rc.3 para Codex

> **Estado:** completada
> **Prioridad:** media
> **Dependencias:** SETUP-gentle-ai-codex-experiment (histórica en la rama rc.1)

## Contexto

La prueba de `v2.5.0-rc.1` demostró que la instalación completa de Gentle duplica SDD, Engram e instrucciones, y escribe fuera del workspace. `v2.5.0-rc.3` publica un protocolo de review nuevo (`capabilities/v2.3`, `start/v4`, `status/v5`) con continuaciones ejecutables, pero debe evaluarse sin portar el trabajo de producto de #68 ni habilitar RDD implícitamente.

## Objetivo

Evaluar rc.3 mediante una capa anti-corrupción portable, fail-closed y reversible que preserve GlyphLog como autoridad del workflow.

## Especificación

N/A. Experimento de tooling sobre un contrato externo, sin comportamiento de producto.

## Test design

N/A. Los contratos se fijan en fixtures JSON y pruebas del adaptador antes de cualquier lifecycle real.

### Matriz de automatización

| Caso  | Test ejecutable previsto                                    | Nivel       | Resultado                                      |
| ----- | ----------------------------------------------------------- | ----------- | ---------------------------------------------- |
| TC-01 | normalización de los nueve estados públicos                 | unitario    | pasa                                           |
| TC-02 | rechazo de schema/protocol/version/features desconocidos    | unitario    | pasa                                           |
| TC-03 | rechazo de target, lineage, revision y scope drift          | unitario    | pasa                                           |
| TC-04 | rechazo de comando/token alterado                           | unitario    | pasa                                           |
| TC-05 | rechazo de replay de acknowledgement                        | unitario    | pasa                                           |
| TC-06 | rechazo de inventario untracked distinto                    | unitario    | pasa                                           |
| TC-07 | bundle completo simulado y bundle incompleto                | unitario    | pasa; el oficial falla cerrado                 |
| TC-08 | status en repositorio desechable sin escrituras al HOME     | integración | pasa con provider simulado                     |
| TC-09 | `bash scripts/gentle-ai.sh version`                         | smoke real  | `2.5.0-rc.3`                                   |
| TC-10 | `bash scripts/gentle-ai.sh capabilities`                    | smoke real  | rechazo esperado `bundle_inventory_incomplete` |
| TC-11 | `review mode status`                                        | smoke real  | RDD apagado                                    |
| TC-12 | STATUS real en `bwrap`, HOME solo lectura y repo desechable | integración | `status/v5`, sin mutación                      |

## Decisiones de Plan mode

- **Enfoque técnico:** runner shell mínimo más adaptador Python estándar; el shell solo descarga payloads fijados y el adaptador valida/normaliza el protocolo.
- **Capas afectadas:** instrucciones, skills, scripts y documentación; ninguna app.
- **Dependencias y orden:** checksum → capabilities → bundle → scope/binding → transición argv → estado efímero.
- **Riesgos y mitigaciones:** supply chain mediante hashes; command injection mediante argv; drift/replay mediante binding persistido; contratos incompletos mediante rechazo.
- **Archivos previstos:** `AGENTS.md`, `.agents/skills/`, `.gitignore`, `scripts/`, `docs/` y `memory-bank/decisions.md`.

## Tareas técnicas

- [x] Crear `experiment/gentle-ai-codex-rc3` desde `main` en `91f8cd3`.
- [x] Preservar la rama rc.1 y excluir todo el código, fixtures y E2E de #68.
- [x] Verificar binario, checksums, capabilities, runtime y features de rc.3.
- [x] Inspeccionar el bundle oficial y convertir la discrepancia de schemas en gate ejecutable.
- [x] Portar el `AGENTS.md` compacto y los adaptadores Codex, sin `.codex/config.toml` innecesario.
- [x] Implementar runner y adaptador con scopes, binding, inventario, argv seguro y replay guard.
- [x] Añadir fixtures y pruebas unitarias/integración.
- [x] Ejecutar STATUS real en sandbox sin red y con filesystem global de solo lectura.
- [x] Documentar benchmark, adopción, rollback y ADRs.
- [x] Mantener RDD deshabilitado; no ejecutar lifecycle mutante ni benchmark.

## Criterios de aceptación

- ✅ El binario rc.3 solo se ejecuta tras validar su SHA-256 oficial.
- ✅ Capabilities exige contrato v2, protocolo 2.3, schemas v2.3/v4/v5 y features obligatorias.
- ✅ El bundle incompleto bloquea status, step y la habilitación de RDD.
- ✅ Las continuaciones admitidas se ejecutan como argv ordenado y nunca mediante shell.
- ✅ Target, lineage, revision, scope, inventario y replay tienen rechazos tipados.
- ✅ El estado local se limita a `.gentle-ai/`, ignorado por Git.
- ✅ Gentle no autoriza ninguna acción de entrega.
- ✅ Existe evidencia automatizada y smoke real, diferenciados.

## Notas técnicas

El bundle oficial `gentle-ai-review-provider-contract-1.1.0.tar.gz` tiene SHA-256 `1acabf9c…feb85b`, pero su inventario omite `transition-execution`, `start-v4`, `capabilities-v2.3` y `status-v5`. La release rc.3 anuncia un bundle completo; por tanto ADR-020 queda rechazada para adopción y el benchmark A/B no se inicia.

## Archivos relevantes

- `scripts/gentle-ai.sh`
- `scripts/gentle_ai_adapter.py`
- `scripts/tests/`
- `.agents/skills/gentle-review/SKILL.md`
- `docs/experiments/gentle-ai-codex.md`
- `memory-bank/decisions.md`
