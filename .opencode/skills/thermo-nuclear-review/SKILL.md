---
name: thermo-nuclear-review
description: Use for an extremely strict code quality review focusing on abstraction quality, giant files (>1K lines), spaghetti-condition growth, and maintainability. Triggers on: code review, revisión de código, quality audit, auditoría de calidad, thermonuclear review, revisión estricta, hazme code review.
---

# Thermo-Nuclear Code Quality Review — GlyphLog

Usa esta skill para una revisión inusualmente estricta enfocada en calidad de implementación, mantenibilidad, calidad de abstracciones y salud del código.

**Principio fundamental**: busca "code judo" — reestructuraciones que preservan comportamiento pero hacen la implementación dramáticamente más simple, más pequeña, más directa y más elegante.

## Prompt Base

> Realiza una auditoría profunda de calidad de código de los cambios en esta rama. Repiensa cómo estructurar/implementar los cambios para mejorar significativamente la calidad sin afectar el comportamiento. Trabaja para mejorar abstracciones, modularidad, reducir spaghetti code, mejorar concisión y legibilidad. Sé ambicioso: si hay un camino claro para mejorar la implementación que implique reestructurar parte del código, hazlo. Sé extremadamente riguroso. Mide dos veces, corta una.

---

## Estándares No Negociables

### 0. Simplificación estructural ambiciosa
- No te conformes con "esto podría ser más limpio"
- Busca oportunidades para que ramas enteras, helpers, modos, condicionales o capas desaparezcan
- Prefiere la solución que haga el código sentirse inevitable en retrospectiva
- Asume que casi siempre hay un "code judo" disponible

### 1. Archivos >1000 líneas
- Trátalo como un smell fuerte por defecto
- Si el diff cruza esa barrera, pregunta explícitamente si se debería descomponer primero
- Prefiere extraer helpers, subcomponentes, módulos o abstracciones locales

### 2. Spaghetti growth
- Sé muy sospechoso de nuevos condicionales ad-hoc, casos especiales dispersos o branches insertados en flujos no relacionados
- Si un cambio añade "ifs raros en sitios aleatorios", trátalo como problema de diseño
- Prefiere empujar la lógica a una abstracción dedicada, state machine, policy object o módulo separado

### 3. Limpiar diseño > aceptar código que funciona
- Si el comportamiento puede mantenerse igual mientras la estructura se vuelve significativamente más limpia, empuja por la versión más limpia
- No apruebes implementaciones "funciona" que dejan el código más sucio
- Prefiere simplificaciones que eliminan piezas móviles

### 4. Código directo, aburrido y mantenible > código hacky o mágico
- Trata el código frágil, ad-hoc o "mágico" como problema de calidad
- Sé escéptico de mecanismos genéricos que esconden suposiciones simples sobre datos
- Señala abstracciones finas, wrappers de identidad o pass-throughs que añaden indirección sin claridad

### 5. Tipos y fronteras limpias
- En TypeScript: cuestiona `any`, `unknown`, casts innecesarios o código con muchas opcionalidades
- En Python: cuestiona `Optional` donde no debería serlo, `dict` sin TypedDict, `Any` de typing
- Si una rama depende de fallback silencioso para esconder un invariante poco claro, pregunta si la frontera debería ser explícita

### 6. Lógica en la capa canónica
- En el frontend: la lógica de negocio va en hooks/services, no en componentes
- En el backend: routers → services → repositories (nunca lógica en modelos SQLAlchemy ni queries en routers)
- Señala lógica de feature filtrándose en paths compartidos
- Prefiere helpers/utilidades canónicas existentes sobre one-offs

### 7. Orquestación secuencial innecesaria y actualizaciones no atómicas
- Si trabajo independiente se serializa sin buena razón, pregunta si debería ir en paralelo
- Si actualizaciones relacionadas pueden dejar estado a medias, empuja por estructura más atómica

---

## Preguntas de Revisión

Para cada cambio significativo:
- ¿Hay un "code judo" que haría esto dramáticamente más simple?
- ¿Se puede replantear para que se necesiten menos conceptos, ramas o helpers?
- ¿Esto mejora o empeora la arquitectura local?
- ¿El diff añadió branching complexity donde debería existir una abstracción?
- ¿Un módulo cohesionado se volvió más acoplado o más difícil de escanear?
- ¿Esta lógica vive en el archivo y capa correctos?
- ¿El cambio agrandó un archivo o componente más allá de un límite saludable?
- ¿Hay condicionales repetidos que señalan un modelo o helper faltante?
- ¿La implementación es directa y legible, o depende de casos especiales?
- ¿Esta abstracción realmente se gana su existencia, o es solo un wrapper?

---

## Qué Señalar Agresivamente

- Una implementación complicada donde una reestructuración más limpia podría eliminar categorías enteras de complejidad
- Refactors que mueven código pero no reducen conceptos a retener
- Un archivo cruzando 1000 líneas por el PR
- Nuevos condicionales atornillados a paths no relacionados
- Booleanos ad-hoc, modos nullable o flags que complican flujo existente
- Lógica de feature filtrándose en módulos de propósito general
- Manejo genérico "mágico" que esconde estructura simple
- Wrappers finos o abstracciones de identidad que añaden indirección
- Casts innecesarios, `any`, `Optional` que enturbian el contrato real
- Lógica copiada/pegada en vez de helpers extraídos
- Edge-cases estrechos implementados en medio de una función ya ocupada
- Refactors que técnicamente pasan tests pero hacen el código menos modular
- Branching "temporal" que se volverá deuda permanente
- Helpers bespoke donde ya existe una utilidad canónica
- Lógica añadida en la capa equivocada

---

## Remedios Preferidos

- Eliminar una capa entera de indirección en vez de pulirla
- Replantear el modelo de estado para que condicionales desaparezcan
- Cambiar la frontera de ownership para que el feature sea extensión natural de una abstracción existente
- Convertir lógica de casos especiales en un flujo default más simple
- Extraer un helper o función pura
- Dividir un archivo grande en módulos más pequeños y enfocados
- Mover lógica específica de feature detrás de una abstracción dedicada
- Reemplazar cadenas de condiciones con un modelo tipado o dispatcher explícito
- Separar orquestación de lógica de negocio
- Colapsar ramas duplicadas en un solo flujo más claro
- Eliminar wrappers que no clarifican la API
- Reusar el helper canónico existente

---

## Tono de Revisión

Sé directo, serio y exigente con la calidad. No seas grosero, pero no suavices problemas graves de mantenibilidad. Si el código está haciendo el codebase más sucio, dilo claramente.

Frases recomendadas:
- `esto empuja el archivo más allá de 1K líneas. ¿podemos descomponerlo primero?`
- `esto añade otro caso especial a un flujo ya ocupado. ¿podemos moverlo detrás de su propia abstracción?`
- `esto funciona, pero hace el código circundante más spaghetti. mantengamos el comportamiento y reestructuremos la implementación`
- `esto parece lógica de feature filtrándose en un path compartido. ¿podemos aislarlo?`
- `esta abstracción parece innecesaria. ¿podemos mantener el flujo directo?`
- `¿por qué necesita un cast / optional aquí? ¿podemos hacer la frontera más explícita?`
- `creo que hay un code-judo aquí que hace esto mucho más simple. ¿podemos replantearlo?`

---

## Prioridad de Hallazgos

1. Regresiones estructurales de calidad
2. Oportunidades perdidas de simplificación dramática / code-judo
3. Aumentos de spaghetti / branching complexity
4. Problemas de frontera / abstracción / contratos de tipos
5. Preocupaciones de tamaño de archivo y descomposición
6. Issues de modularidad y abstracción
7. Preocupaciones de legibilidad y mantenibilidad

---

## Barra de Aprobación

No apruebes solo porque el comportamiento parece correcto. La barra es:
- ✅ Sin regresión estructural clara
- ✅ Sin oportunidad obvia perdida de simplificación dramática
- ✅ Sin explosión injustificada de tamaño de archivo
- ✅ Sin spaghetti-growth obvio por branching de casos especiales
- ✅ Sin abstracción hacky o mágica que haga el código más difícil de razonar
- ✅ Sin wrapper/cast/optional innecesarios oscureciendo el diseño real
- ✅ Sin fuga clara de frontera de arquitectura o duplicación de helper canónico

Bloqueos presuntivos (el autor debe justificar):
- El PR preserva mucha complejidad incidental cuando hay un code-judo plausible que la eliminaría
- El PR empuja un archivo de <1K a >1K líneas
- El PR añade branching ad-hoc que enreda un flujo existente
- El PR resuelve un problema local dispersando feature checks en código compartido
- El PR añade una abstracción innecesaria, wrapper o contrato cast-heavy
- El PR duplica un helper existente o pone lógica en la capa equivocada
