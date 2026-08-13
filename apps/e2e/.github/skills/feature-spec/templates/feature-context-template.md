# Feature Context: [Feature Name]

> **Instructions**: Completa las secciones de abajo para dar contexto al crear una feature spec.
> Solo rellena lo que sepas — el agente preguntará lo que falte.

---

## Feature Overview

**Feature Name**: [ej. "Filtros de colección"]

**Description**: 
[Describe qué hace la feature en 1-2 frases]

**User Story** (Opcional):
> As a [tipo de usuario]
> I want to [realizar acción]
> So that [resultado deseado]

---

## Current State

**Existing Implementation**:
- [ ] La feature existe y necesita tests
- [ ] La feature es nueva (no implementada aún)
- [ ] La feature existe pero necesita refactor

**Related Files**:
- Page URL: [ej. `/collection`]
- Existing Page Objects: [ej. `CollectionPage.ts`]
- Existing Tests: [ej. Ninguno / `collection.spec.ts`]

---

## User Flows

### Primary Flow
**Starting Point**: [ej. "Usuario está en /collection"]

**Steps**:
1. [Acción 1]
2. [Acción 2]
3. [Acción 3]

**Expected Outcome**: [Qué debe pasar al final]

### Alternative Flows (Opcional)
**Error Case**: [ej. "Usuario aplica filtro sin entradas de ese tipo"]
- Expected: [ej. "Muestra mensaje 'No hay entradas de este tipo'"]

**Edge Case**: [ej. "Colección vacía"]
- Expected: [ej. "Muestra estado vacío con botón 'Crear primera entrada'"]

---

## Elements of Interest

Lista de elementos a testear:
- [Element 1]: [ej. "Botón de filtro 'Anime'"]
- [Element 2]: [ej. "Selector de ordenación"]
- [Element 3]: [ej. "Grid de tarjetas de entrada"]

---

## Known Constraints

**Technical Constraints**:
- [ej. "Requiere autenticación Google OAuth"]
- [ej. "Los datos vienen de API con paginación"]

**Business Rules**:
- [ej. "Solo el owner puede ver su colección"]
- [ej. "Máximo 50 entradas por página"]

---

## Test Priorities

¿Qué es más importante testear?
1. [High Priority]: [ej. "Visibilidad de entradas en la colección"]
2. [Medium Priority]: [ej. "Filtrado por tipo (anime/manga/game)"]
3. [Low Priority]: [ej. "Hover effects en tarjetas"]

---

## Questions/Uncertainties

Lista de dudas:
- [ej. "¿Los filtros persisten al navegar atrás?"]
- [ej. "¿Qué selectores usa shadcn/ui para los botones de filtro?"]

---

## Additional Notes

[Cualquier otro contexto útil]
