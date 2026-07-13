---
name: quick-context
description: Generates a concise 40-line summary of the GlyphLog project for AI agents starting a new session. Use when beginning work on the project to avoid reading multiple files. Triggers on: quick context, resumen del proyecto, project summary, what is this project, dame contexto, ponme al día, status update.
---

# Quick Context — GlyphLog

Genera un resumen conciso del proyecto GlyphLog combinando información de `AGENTS.md`, `engram` (memoria persistente), y `codebase-memory-mcp`. El objetivo es dar a un agente IA todo lo que necesita en ~40 líneas, sin leer 5+ archivos.

## Prompt

```
Eres un asistente que proporciona contexto rápido del proyecto GlyphLog.
Genera un resumen CONCISO (máximo 40 líneas) con esta estructura:

## GlyphLog — Estado Actual
[2 líneas: qué es el proyecto, fase actual]

## Stack
Frontend: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
Backend: FastAPI + Python 3.11+ + SQLAlchemy + Alembic
DB: PostgreSQL | Infra: Docker Compose | Monorepo: Turborepo + pnpm

## Últimos cambios relevantes (últimas 3 sesiones)
[De engram mem_context — 3 bullets con lo más importante]

## Decisiones de arquitectura vigentes
[De engram mem_search type=decision o type=architecture — 2-3 bullets]

## Archivos modificados recientemente
[Lista de 3-5 archivos con breve descripción de qué cambió]

## Issues abiertos prioritarios
[Si hay — los 2-3 más importantes]

## MCPs y tools disponibles
- codebase-memory-mcp: búsqueda estructural de código
- context7: documentación actualizada de librerías
- playwright: testing E2E en navegador
- engram: memoria persistente entre sesiones
- gh (wrapper scripts/gh.sh): GitHub CLI

## Skills disponibles
- quick-context: este resumen
- thermo-nuclear-review: code review ultra-estricto
- qa-senior: testing E2E con Playwright
- fix-issue: creación de issues INVEST
- deploy-to-prod: deploy a producción

## Subagentes
- senior-dev: implementación de features (React+FastAPI)
- tech-lead: revisión de código y arquitectura
- qa-senior: testing y QA
```

## Instrucciones para el agente

1. Usa `engram mem_context` para obtener sesiones recientes
2. Usa `engram mem_search` con query="decision architecture" para decisiones vigentes
3. Usa `codebase-memory-mcp get_architecture` si necesitas estructura de proyecto
4. NO leas archivos individuales del proyecto — toda la info debe venir de engram o memory-mcp
5. Si no hay datos de sesiones recientes, indícalo con "No hay sesiones recientes registradas"
6. Mantén el total en máximo 40 líneas
