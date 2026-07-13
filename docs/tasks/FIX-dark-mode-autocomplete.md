# [FIX] Autocompletados invisibles en modo oscuro

> **Estado:** done
> **Prioridad:** media
> **Severidad:** P2 — major (UX degradada, feature inutilizable en dark mode)
> **Dependencias:** ninguna

## Contexto

El componente `ExternalSearchAutocomplete` (`apps/web/src/components/shared/entry-form/external-search-autocomplete.tsx`) es un autocomplete custom-built que busca en catálogos externos (MAL/RAWG) para autocompletar título, tipo, año y portada. Usa un `<input>` nativo y un `<div>` posicionado absolutamente como dropdown.

En modo oscuro, el dropdown de resultados y/o el texto del input no son visibles. El componente usa opacity modifiers de Tailwind (`bg-popover/95`, `bg-muted/70`, `bg-muted/30`) sobre colores definidos como `oklch(var(--variable))` en el Tailwind config, lo que puede causar problemas de renderizado.

## Objetivo

Garantizar que el dropdown de autocompletado y todos sus elementos (input de búsqueda, resultados, badges, texto) sean perfectamente legibles tanto en modo claro como en modo oscuro.

## Bug reportado

**Descripción:** En modo oscuro, el dropdown de autocompletado del buscador de catálogo no se ve correctamente (texto y/o fondo invisibles).

**Pasos para reproducir:**
1. Activar modo oscuro (toggle de tema)
2. Navegar a `/entries/create`
3. Escribir 3+ caracteres en el campo "Buscar título en MAL / RAWG..."
4. Observar: el dropdown de resultados no se ve o es ilegible

**Resultado esperado:** El dropdown muestra los resultados con fondo oscuro, texto claro y buen contraste.
**Resultado actual:** El dropdown no es visible o tiene contraste insuficiente.

## Análisis de causa raíz

**Archivo(s) afectado(s):**
- `apps/web/src/components/shared/entry-form/external-search-autocomplete.tsx`

**Causa identificada (múltiples factores):**

1. **`bg-popover/95` con oklch (línea 109):** El Tailwind config define `popover` como `'oklch(var(--popover))'` — una cadena completa sin placeholder `<alpha-value>`. Cuando Tailwind genera `bg-popover/95`, no puede inyectar el alpha value en este formato, lo que puede producir CSS inválido o un fallback inesperado. En dark mode, `--popover` es `0.17 0.02 270` (muy oscuro), y si el fondo no se aplica correctamente, el texto oscuro sobre fondo oscuro es invisible.

2. **Input sin `text-foreground` explícito (línea 94):** El `<input>` usa `bg-muted/30` pero no establece `text-foreground`. Si la cascada de herencia se rompe en algún punto intermedio, el texto del input puede heredar un color que no contrasta con el fondo.

3. **`hover:bg-muted/70` en items de resultado (línea 127):** Mismo problema de opacity modifier con oklch. En dark mode, `--muted` es `0.22 0.02 270` (oscuro), y al 70% de opacidad se vuelve casi transparente, haciendo el hover state prácticamente invisible.

4. **`bg-muted/30` en el input (línea 94):** En dark mode, `muted` al 30% de opacidad sobre un fondo oscuro puede ser imperceptible, haciendo que el input parezca no tener fondo.

**Impacto:** El autocomplete es inutilizable en dark mode. Afecta a la página de creación de entradas, que es un flujo principal.

## Tareas técnicas

- [x] Crear helper reutilizable `apps/web/src/lib/tailwind-opacity.ts` con clases arbitrary value `bg-[oklch(var(--color)/opacity)]` para evitar opacity modifiers sobre oklch.
- [x] Reemplazar `bg-popover/95` por `bg-[oklch(var(--popover)/0.95)]` en el contenedor del dropdown (`external-search-autocomplete.tsx`).
- [x] Reemplazar `bg-muted/30` por `bg-[oklch(var(--muted)/0.3)]` en el input de búsqueda (`external-search-autocomplete.tsx`).
- [x] Reemplazar `hover:bg-muted/70` por `hover:bg-[oklch(var(--muted)/0.7)]` en los items de resultado (`external-search-autocomplete.tsx` y `search-bar.tsx`).
- [x] Reemplazar `bg-accent/30` y `bg-accent/40` por sus equivalentes oklch en badges.
- [x] Aplicar la misma corrección en otros componentes con el mismo patrón: `search-bar.tsx`, `entry-form-fields.tsx`, `optional-fields.tsx` y `entry-type-select.tsx`.
- [x] Verificar manualmente ambos modos (light y dark) y ejecutar build, lint y tests.

## Criterios de aceptación

- ✅ En modo oscuro, el dropdown de autocompletado muestra un fondo oscuro visible con texto claro legible
- ✅ En modo claro, el dropdown sigue viéndose correctamente (sin regresión)
- ✅ El input de búsqueda tiene texto visible en ambos modos
- ✅ Los estados hover y active de los items de resultado son distinguibles en ambos modos
- ✅ Los badges de tipo (Anime/Manga/Videojuego) son legibles en ambos modos
- ✅ No se introducen opacity modifiers sobre colores oklch que puedan fallar
- ✅ Los tests existentes siguen pasando

## Notas técnicas

### Solución implementada

Se optó por mantener los valores de opacidad originales usando clases arbitrary value con sintaxis oklch completa (`bg-[oklch(var(--popover)/0.95)]`). Tailwind 3.x sí puede generar correctamente estas clases, a diferencia de los opacity modifiers (`bg-popover/95`) que no se componen bien sobre colores definidos como `oklch(var(--color))`.

Para evitar repetir la sintaxis verbosa y centralizar el mantenimiento, se creó `apps/web/src/lib/tailwind-opacity.ts` con objetos type-safe (`bgOpacity`, `hoverBgOpacity`, `disabledBgOpacity`). Las clases permanecen como strings literales, por lo que Tailwind las detecta para el purge.

**Archivos afectados finalmente:**
- `apps/web/src/components/shared/entry-form/external-search-autocomplete.tsx`
- `apps/web/src/components/shared/search-bar.tsx`
- `apps/web/src/components/shared/entry-form/entry-form-fields.tsx`
- `apps/web/src/components/shared/entry-form/optional-fields.tsx`
- `apps/web/src/components/shared/entry-form/entry-type-select.tsx`

**Nota sobre JSDoc:** los comentarios del helper no deben incluir literalmente la sintaxis `bg-[oklch(...)]`, porque Tailwind escanea todo el archivo y generaría CSS inválido.

## Archivos relevantes

- `apps/web/src/lib/tailwind-opacity.ts` — helper reutilizable con clases oklch + opacity
- `apps/web/src/components/shared/entry-form/external-search-autocomplete.tsx` — componente principal a corregir
- `apps/web/src/components/shared/search-bar.tsx` — mismo patrón corregido
- `apps/web/src/components/shared/entry-form/entry-form-fields.tsx` — mismo patrón corregido
- `apps/web/src/components/shared/entry-form/optional-fields.tsx` — mismo patrón corregido
- `apps/web/src/components/shared/entry-form/entry-type-select.tsx` — mismo patrón corregido
- `apps/web/tailwind.config.ts` — definición de colores oklch (referencia, no se modifica)
- `apps/web/src/index.css` — variables CSS de tema (referencia, no se modifica)

## Validación INVEST

- [x] **Independent:** No depende de otros issues. Fix autocontenido en un componente.
- [x] **Negotiable:** Los colores exactos a usar son negociables.
- [x] **Valuable:** El autocomplete es inutilizable en dark mode. Afecta un flujo principal.
- [x] **Estimable:** ~45 minutos (helper + cambios en 5 archivos + verificación visual).
- [x] **Small:** Cambios localizados en clases Tailwind y un helper reutilizable.
- [x] **Testable:** Verificar visualmente en light y dark mode. Binario por cada criterio.
