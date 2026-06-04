# [SETUP] Definir la base del proyecto GlyphLog

## Objetivo
Definir la base funcional, técnica y organizativa de GlyphLog para arrancar el desarrollo con una dirección clara, moderna y orientada al aprendizaje.

GlyphLog será una aplicación para registrar, organizar y seguir animes, mangas y videojuegos.  
El proyecto estará diseñado como un producto incremental, mantenible y preparado para flujos de trabajo asistidos por IA.

---

## Visión del proyecto
GlyphLog busca ser una aplicación personal para gestionar una colección multimedia y de entretenimiento, permitiendo al usuario registrar contenido, seguir su progreso y organizar su consumo de anime, manga y videojuegos.

El proyecto tiene también un objetivo formativo y profesional:
- aprender tecnologías modernas
- practicar arquitectura full-stack
- trabajar con herramientas actuales del ecosistema
- incorporar flujos de trabajo orientados a IA
- construir un proyecto con valor de portfolio

---

## Objetivos principales
- desarrollar una aplicación full-stack moderna
- aprender una arquitectura cliente-servidor clara
- usar herramientas actuales y demandadas
- trabajar con un entorno containerizado
- integrar prácticas “IA-ready” desde el inicio
- evolucionar el producto por tareas pequeñas y bien definidas

---

## Decisiones tomadas

### Plataforma
- El producto será **web** en su primera fase.
- Se tendrá en cuenta una futura evolución hacia **móvil** o experiencia móvil mejorada.

### Arquitectura
- Se usará una arquitectura de **frontend y backend diferenciados**.
- El código vivirá en un **monorepo**.
- El sistema deberá poder evolucionar sin reestructuraciones drásticas.

### Frontend
- **React**
- **Vite**
- **TypeScript**
- **Tailwind CSS**

### Modelo de Renderizado y Arquitectura: SPA vs. SSR
Se ha evaluado la opción de utilizar una **SPA (Single Page Application)** frente a una arquitectura de **Renderizado en el Servidor (SSR)**:

*   **SPA (Single Page Application - React + Vite):**
    *   *Ventajas:* Experiencia fluida "tipo aplicación" (sin recargas de página), desacoplamiento total del backend (FastAPI es una API JSON limpia), menor coste de despliegue (se sirve como archivos estáticos en Vercel, Netlify o Cloudflare Pages de forma gratuita).
    *   *Desventajas:* Carga inicial ligeramente superior y SEO subóptimo de base.
*   **SSR (Server-Side Rendering - Next.js / Remix / FastAPI + Jinja2):**
    *   *Ventajas:* Carga inicial ultrarrápida, SEO perfecto y simplificación de la seguridad en sesiones al manejarse directamente en el servidor.
    *   *Desventajas:* Requiere un servidor Node.js activo en producción (mayor coste) o acoplamiento excesivo con plantillas de Python/Jinja2, perdiendo interactividad dinámica rica en el cliente.

**Decisión final:** **SPA (Single Page Application)** con React + Vite. Dado que GlyphLog es un panel personal e interactivo que no requiere indexación SEO pública, los beneficios de una SPA (menor complejidad, desacoplamiento limpio de la API, despliegue estático y agilidad de desarrollo) superan con creces las ventajas del SSR.

### Backend
- **FastAPI**
- **Python**
- validación con herramientas del ecosistema FastAPI/Pydantic

### Persistencia
- **PostgreSQL**
- desplegada en **Oracle Cloud**, aprovechando la infraestructura gratuita disponible

### Infraestructura
- desarrollo local con **Docker**
- orquestación local con **Docker Compose**

### Autenticación
El producto incluirá autenticación de usuario.
Objetivo funcional previsto:
- registro con email y contraseña
- inicio de sesión
- login social
- recuperación de contraseña

### IA / agent-ready
El proyecto incorporará desde el inicio:
- `AGENTS.md`
- skills
- hooks
- MCPs
- convenciones de documentación y tareas pensadas para asistentes de IA

---

## Objetivo del MVP
El MVP funcional debe permitir:
- registro de usuario
- inicio de sesión
- creación de entradas
- visualización de la colección personal
- edición de entradas
- eliminación de entradas

Cada entrada podrá pertenecer a uno de estos tipos:
- anime
- manga
- videojuego

---

## Modelo funcional deseado
A nivel de producto, una entrada podrá llegar a contener:
- título
- tipo
- estado
- progreso
- rating
- tags
- notas

Sin embargo, para evitar complejidad prematura, la implementación se hará por fases.

### Fase inicial recomendada
- título
- tipo
- estado

### Fase posterior
- progreso

### Fases siguientes
- rating
- tags
- notas

---

## Principios de diseño
- priorizar claridad sobre complejidad
- evitar sobreingeniería
- diseñar para evolución incremental
- mantener tareas pequeñas y accionables
- documentar bien las decisiones relevantes
- favorecer estructuras comprensibles para personas y asistentes de IA

---

## Principios de trabajo con IA
- cada tarea debe tener contexto suficiente
- cada tarea debe tener un objetivo claro y acotado
- cada tarea debe incluir criterios de aceptación verificables
- el contexto del proyecto debe mantenerse en documentación persistente
- `AGENTS.md` recogerá las reglas globales del proyecto
- las skills recogerán instrucciones concretas y reutilizables
- los hooks y MCPs se documentarán y añadirán de forma incremental

---

## Testing
La estrategia inicial de testing será ligera.

### Prioridad inicial
- tests unitarios cuando aporten valor
- validación de lógica crítica
- validación de parsing, esquemas y reglas de negocio simples

### No prioritario al inicio
- e2e completos
- tests visuales
- cobertura exhaustiva temprana

El enfoque será crecer en testing a medida que aumente la complejidad del producto.

---

## Estructura inicial propuesta del monorepo
- `apps/web` → frontend React + Vite
- `apps/api` → backend FastAPI
- `packages/` → librerías compartidas si en el futuro hacen falta
- `docs/` → documentación de producto y técnica
- `docs/skills/` → skills para asistentes
- `AGENTS.md` → contexto global del proyecto

---

## Decisiones aún pendientes
Todavía hay que cerrar:
- gestor del monorepo
- librería de componentes exacta para frontend
- sistema exacto de login social
- estrategia exacta de recuperación de contraseña
- modelado del progreso por tipo de contenido
- estructura concreta de skills, hooks y MCPs
- estrategia de despliegue inicial de frontend y backend

---

## Criterios de aceptación del setup
Este setup se considerará completado cuando:
- la visión del proyecto esté documentada
- el MVP esté definido
- el stack principal esté decidido
- la estructura inicial del monorepo esté definida
- existan criterios iniciales de trabajo con IA
- existan tareas derivadas para arrancar la implementación

---

## Primeras tareas derivadas
- crear `README.md`
- crear `AGENTS.md`
- definir estructura del monorepo
- decidir herramienta de monorepo
- crear scaffold de frontend
- crear scaffold de backend
- crear entorno Docker Compose
- definir modelo inicial de usuario
- definir modelo inicial de entrada
- crear HU de registro
- crear HU de login
- crear HU de creación de entrada
