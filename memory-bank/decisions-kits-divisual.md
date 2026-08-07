# Decisión: Integración de Kits Divisual

> **Fecha:** 6 de agosto de 2026
> 
> **Tipo:** Architecture Decision Record (ADR)
> 
> **Estado:** Planificado (no ejecutado)

---

## Contexto

Se dispone de 8 kits de Divisual (herramientas de análisis/auditorías) y se debe decidir cómo integrarlos o usarlos en relación con el proyecto GlyphLog.

Los kits disponibles son:
1. Kit 01 — Cazador de webs (reconstruir webs modernas)
2. Kit 02 — Agente WhatsApp (bot de WhatsApp con CRM)
3. Kit 03 — Auditoría de negocio (auditoría digital + tecnológica)
4. Kit 04 — Análisis de YouTube (auditoría de canales)
5. Kit 05 — Editor de vídeo (editor vertical local)
6. Kit 06 — Marca personal (auditoría de Instagram + huella pública)
7. Kit 07 — Análisis de e-commerce (auditoría de tiendas online)
8. Kit 08 — Creador de kits (meta-kit para crear nuevos kits)

---

## Opciones evaluadas

### **Opción A: Kits standalone**
- Mantener los kits en carpeta separada `kits-descomprimidos/`
- Usarlos manualmente cuando se necesiten
- Sin integración con GlyphLog
- **Descartada:** No tiene sentido sin clientes reales

### **Opción B: Integración en GlyphLog** ✅ ELEGIDA
- Integrar los 8 kits dentro del monorepo de GlyphLog
- GlyphLog pasa a ser plataforma dual: tracking personal + suite de kits
- Tiempo: 15-25 días
- Compartir arquitectura (React + FastAPI + PostgreSQL + Bedrock)

### **Opción C: Proyecto independiente (Divisual Toolkit)**
- Crear proyecto completamente separado
- Enfoque SaaS (monetizable)
- Tiempo: 6-9 semanas
- **Aplazada:** Ejecutar después de validar Plan B

---

## Decisión

**Se ejecutará Plan B (integración en GlyphLog) primero.**

**Razones:**
1. Tiempo de desarrollo más corto (15-25 días vs 6-9 semanas)
2. Aprovecha infraestructura existente (auth, BD, deploy)
3. Un solo proyecto que mantener
4. Validación temprana antes de invertir en Plan C
5. Plan C sigue siendo opción para el futuro

---

## Consecuencias

### **Positivas:**
- Portfolio más completo (tracking + análisis/auditorías)
- Demostración de integración con Claude + Bedrock
- Historial centralizado de reportes en PostgreSQL
- UX superior (interfaz web vs CLI)

### **Negativas:**
- GlyphLog pierde propósito claro (mezcla tracking personal + auditorías)
- Mayor complejidad del proyecto
- No monetizable (uso personal)
- Potencial overengineering si no se usan frecuentemente

---

## Arquitectura propuesta

Ver detalle completo en:
- [`Planes-Kits-Divisual/PLAN-B-INTEGRACION-GLYPHLOG.md`](C:\Users\mario\OneDrive\Escritorio\Gestiones\Mias\Planes-Kits-Divisual\PLAN-B-INTEGRACION-GLYPHLOG.md)

**Resumen:**
```
GlyphLog/
├── apps/web/
│   └── src/pages/
│       ├── kits/                # NUEVO: Dashboard + interfaces de kits
│       └── reports/             # NUEVO: Historial de auditorías
├── apps/api/
│   └── app/
│       ├── routers/kits.py      # NUEVO: Endpoints de kits
│       ├── services/kits/       # NUEVO: Lógica de cada kit
│       └── integrations/bedrock/ # NUEVO: Cliente Bedrock
└── kits/                        # NUEVO: Código de los 8 kits
```

**Nueva tabla:**
- `kit_reports` (id, user_id, kit_type, title, input_data, output_html, output_json, status, tokens_used, created_at)

---

## Fases de desarrollo

1. **Fase 1:** Setup de infraestructura (1-2 días)
2. **Fase 2:** Implementar Kit 03 (auditoría de negocio) — MVP (3-4 días)
3. **Fase 3:** Dashboard y historial de reportes (2 días)
4. **Fase 4:** Implementar resto de kits (1-2 días por kit)
5. **Fase 5:** Pulido y optimización (2-3 días)

**Total:** 15-25 días

---

## Reparto de modelos (Bedrock)

| Modelo | Uso |
|--------|-----|
| Sonnet 4.5 | Kits 01, 03, 06, 07, 08 (análisis/auditorías) |
| Haiku 4.5 | Kit 05 (editor de vídeo — solo dirección) |
| OpenRouter | Kit 02 (WhatsApp bot — no usa Bedrock) |

---

## Criterios de éxito

- [ ] Usuario puede crear auditoría desde `/kits/audit-business`
- [ ] Informe HTML se genera y guarda en BD
- [ ] Usuario puede ver historial en `/reports`
- [ ] Usuario puede exportar reporte como PDF
- [ ] 8 kits disponibles en dashboard `/kits`
- [ ] Tests E2E cubren flujo completo
- [ ] Documentación actualizada en `AGENTS.md`

---

## Reevaluación futura

Después de completar Plan B, evaluar si vale la pena Plan C:

| Pregunta | Si SÍ → Plan C | Si NO → Quedarse en B |
|----------|----------------|----------------------|
| ¿Usas los kits semanalmente? | ✅ | ❌ |
| ¿GlyphLog se siente sobrecargado? | ✅ | ❌ |
| ¿Quieres monetizar los kits? | ✅ | ❌ |
| ¿Tienes 2-3 meses disponibles? | ✅ | ❌ |

**Si 3+ respuestas son SÍ → Ejecutar Plan C**

---

## Referencias

- [Plan B completo](C:\Users\mario\OneDrive\Escritorio\Gestiones\Mias\Planes-Kits-Divisual\PLAN-B-INTEGRACION-GLYPHLOG.md)
- [Plan C completo](C:\Users\mario\OneDrive\Escritorio\Gestiones\Mias\Planes-Kits-Divisual\PLAN-C-DIVISUAL-TOOLKIT-INDEPENDIENTE.md)
- [Comparativa de planes](C:\Users\mario\OneDrive\Escritorio\Gestiones\Mias\Planes-Kits-Divisual\COMPARATIVA-PLANES.md)
- [Kits descomprimidos](C:\Users\mario\OneDrive\Escritorio\Gestiones\Mias\Cosas IA\kits-descomprimidos)

---

**Owner:** Mario (mariobox)

**Próximos pasos:**
1. Crear migración Alembic para tabla `kit_reports`
2. Implementar cliente Bedrock
3. Desarrollar MVP (Kit 03)
