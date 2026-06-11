# Decisiones Arquitectónicas — GlyphLog

> Este archivo registra las decisiones técnicas importantes del proyecto en formato ADR (Architecture Decision Record).
> Cada decisión documenta el contexto, la elección tomada, las razones y las consecuencias.
> Leer este archivo antes de proponer cambios arquitectónicos o elegir nuevas librerías.

---

## Índice

| ID | Título | Estado | Fecha |
|----|--------|--------|-------|
| [ADR-001](#adr-001) | SPA sobre SSR | Aceptada | junio 2025 |
| [ADR-002](#adr-002) | Turborepo como gestor de monorepo | Aceptada | junio 2025 |
| [ADR-003](#adr-003) | shadcn/ui como sistema de componentes | Aceptada | junio 2025 |
| [ADR-004](#adr-004) | JWT en sessionStorage | Aceptada | junio 2025 |
| [ADR-005](#adr-005) | PyJWT en lugar de python-jose | Aceptada | junio 2025 |

---

## ADR-001

### SPA sobre SSR

**Fecha:** junio 2025
**Estado:** Aceptada

#### Contexto

GlyphLog es un panel personal de seguimiento de consumo de entretenimiento. Se evaluó qué tipo de arquitectura frontend adoptar: Single Page Application (SPA) o Server-Side Rendering (SSR). La decisión afecta directamente a las herramientas del frontend, el proceso de despliegue y la complejidad general del proyecto.

#### Decisión

Implementar el frontend como una **SPA con React 18 + Vite**, sin ningún framework de SSR.

#### Razones

- **Sin necesidad de SEO:** GlyphLog es una aplicación personal con acceso privado. No hay páginas que deban ser indexadas por buscadores.
- **Despliegue estático gratuito:** Una SPA se puede desplegar como archivos estáticos en Netlify, Vercel o GitHub Pages sin coste adicional y con configuración mínima.
- **Desacoplamiento limpio con la API:** La separación total entre frontend (estático) y backend (API REST) simplifica el desarrollo y el razonamiento sobre cada capa.
- **Menor complejidad operacional:** No hay servidor de SSR que mantener, escalar o monitorizar.
- **Vite como bundler:** Vite ofrece una DX excepcional (HMR instantáneo, builds rápidos) sin la complejidad de configuración de Webpack.

#### Consecuencias

- La carga inicial de la aplicación puede ser ligeramente mayor en conexiones lentas (se mitiga con code splitting y lazy loading cuando sea necesario).
- La aplicación no es indexable por buscadores (aceptable dado el caso de uso personal).
- Se necesita configuración de redirects en el servidor de hosting para que las rutas de React Router funcionen correctamente (`/*` → `index.html`).

#### Alternativas consideradas

- **Next.js:** Descartado por añadir complejidad innecesaria (SSR, RSC, routing de archivo). El proyecto no necesita nada de lo que justifica Next.js.
- **Remix:** Descartado por los mismos motivos que Next.js. Orientado a casos de uso con SEO y carga de datos en servidor.

---

## ADR-002

### Turborepo como gestor de monorepo

**Fecha:** junio 2025
**Estado:** Aceptada

#### Contexto

El proyecto tiene dos aplicaciones distintas (frontend React y backend Python) que deben vivir en el mismo repositorio para simplificar el desarrollo, el versionado y el onboarding. Se necesitaba una herramienta para gestionar tareas a nivel de monorepo (builds, tests, linting) de forma coordinada.

#### Decisión

Usar **Turborepo** con **pnpm workspaces** como gestor del monorepo.

#### Razones

- **Cacheo inteligente de tareas:** Turborepo cachea los resultados de tareas (build, lint, test) y solo re-ejecuta lo que cambió. Ahorra tiempo significativo en CI y desarrollo local.
- **Pipelines declarativos:** El archivo `turbo.json` define las dependencias entre tareas de forma explícita y legible.
- **DX moderna:** Comandos simples (`pnpm dev`, `pnpm build`) que orquestan múltiples workspaces.
- **Compatible con pnpm:** pnpm workspaces gestiona las dependencias de Node con eficiencia de disco (hardlinks) y resolución estricta.
- **Menor complejidad que Nx:** Turborepo tiene una curva de aprendizaje más baja y es suficiente para las necesidades del proyecto.

#### Consecuencias

- **Node.js requerido en el host** para ejecutar los comandos de Turborepo, incluso para gestionar la parte Python del proyecto. Esto es un requisito de setup adicional pero menor.
- El backend Python (`apps/api`) se integra en el monorepo a través de scripts en su `package.json`, no directamente con pip/poetry. La gestión de dependencias Python sigue siendo independiente.
- Si el proyecto crece significativamente en número de paquetes, puede ser necesario migrar configuración de Turborepo.

#### Alternativas consideradas

- **Nx:** Más potente y con plugins específicos por framework, pero más complejo de configurar y con mayor overhead conceptual. Innecesario para este tamaño de proyecto.
- **pnpm workspaces solo:** Funciona para gestionar dependencias pero no ofrece cacheo de tareas ni pipelines declarativos.
- **npm workspaces:** Descartado por ser más lento que pnpm y con resolución de dependencias menos estricta.

---

## ADR-003

### shadcn/ui como sistema de componentes

**Fecha:** junio 2025
**Estado:** Aceptada

#### Contexto

El frontend necesita un sistema de componentes React que sea accesible, con buen diseño por defecto, y que se integre bien con Tailwind CSS. Se buscaba evitar la dependencia de versión de una librería de componentes y mantener control total sobre el código.

#### Decisión

Usar **shadcn/ui** como sistema base de componentes.

#### Razones

- **Componentes copiados al proyecto:** shadcn/ui no es una librería npm tradicional. Los componentes se copian directamente al repositorio en `src/components/ui/`, lo que otorga control total sobre el código sin depender de versiones de una librería externa.
- **Accesibilidad built-in:** Los componentes están construidos sobre **Radix UI**, que implementa los patrones de accesibilidad ARIA correctamente (focus management, keyboard navigation, screen readers).
- **Tailwind nativo:** Los estilos son clases de Tailwind puro, lo que hace que los componentes sean completamente personalizables y coherentes con el resto del diseño.
- **Sin dependencia de versión:** No hay riesgo de breaking changes en una actualización de librería. El código es tuyo.
- **Activamente mantenido y con buena comunidad:** Amplia adopción, documentación clara y muchos ejemplos disponibles.

#### Consecuencias

- Los componentes en `src/components/ui/` **no se deben modificar directamente** a menos que sea necesario para el proyecto. Las modificaciones deben hacerse en componentes wrapper en `src/components/shared/`.
- Si shadcn/ui lanza mejoras en un componente, la actualización es **manual**: hay que copiar el nuevo código y adaptarlo. No hay `npm update` automático.
- Añadir un nuevo componente de shadcn/ui requiere ejecutar el CLI: `pnpm dlx shadcn-ui@latest add <componente>` desde `apps/web/`.

#### Alternativas consideradas

- **Material UI (MUI):** Descartado por el sistema de theming complejo y la dependencia del sistema de estilos Emotion, que choca con Tailwind.
- **Chakra UI:** Descartado por razones similares a MUI: sistema de estilos propio que no se lleva bien con Tailwind.
- **Headless UI (de Tailwind Labs):** Menos componentes disponibles y menos mantenido que shadcn/ui. shadcn/ui es un superconjunto de lo que ofrece Headless UI.
- **Radix UI directo:** Válido técnicamente, pero requiere implementar todos los estilos desde cero. shadcn/ui ya hace ese trabajo.

---

## ADR-004

### JWT en sessionStorage

**Fecha:** junio 2025
**Estado:** Aceptada

#### Contexto

Como SPA, el frontend necesita persistir el token JWT de acceso entre renders y peticiones. Las opciones evaluadas fueron: memoria del módulo (más seguro), sessionStorage (equilibrio) y localStorage (más cómodo pero menos seguro).

#### Decisión

Almacenar el access token en **sessionStorage** a través del módulo `src/lib/auth-token.ts`.

#### Razones

- **Sobrevive al F5** dentro de la misma pestaña, a diferencia de la memoria del módulo.
- **Se destruye al cerrar la pestaña**, a diferencia de localStorage (el ámbito del ataque es menor).
- **No es accesible desde otras pestañas**, limitando el radio de daño en caso de XSS.
- El proyecto no se usa sin backend activo, lo que hace razonable el trade-off.

#### Consecuencias

- Sigue siendo vulnerable a XSS como cualquier storage de JS. Mitigar con CSP estricta.
- Toda lectura/escritura del token pasa por `auth-token.ts` (nunca directamente desde los componentes).

#### Evolución prevista (post-MVP)

Migrar a: access token en memoria + refresh token en `httpOnly` cookie gestionada por el backend. El frontend solicitará un nuevo token vía `/auth/refresh` al iniciar (silent refresh), el backend lee la cookie httpOnly (inaccesible para JS) y devuelve un nuevo access token.

#### Alternativas consideradas

- **Memoria del módulo:** Máxima seguridad, pero el usuario debe re-hacer login tras cada F5. Descartada por comodidad en MVP.
- **localStorage:** Cómodo pero el token persiste indefinidamente y es accesible entre pestañas. Descartado por ser el vector de ataque más común.
- **httpOnly cookie directa:** La opción más segura, pero requiere soporte del backend (Set-Cookie, CSRF tokens). Pospuesta para post-MVP.

---

## ADR-005

### PyJWT en lugar de python-jose

**Fecha:** junio 2025
**Estado:** Aceptada

#### Contexto

El backend necesita generar y verificar tokens JWT para autenticación. Las dos librerías principales en el ecosistema Python son `python-jose` y `PyJWT`.

#### Decisión

Usar **PyJWT** para la firma y verificación de tokens JWT.

#### Razones

- `python-jose` tiene [CVE-2024-33663](https://nvd.nist.gov/vuln/detail/CVE-2024-33663) activa: algorithm confusion attack que permite que un atacante forje tokens.
- `PyJWT` está activamente mantenido, sin CVEs críticos conocidos.
- API más simple y directa para el caso de uso de HS256 con un secret simétrico.

#### Consecuencias

- La API de `PyJWT` difiere de `python-jose`: `jwt.encode(payload, key, algorithm=...)` vs `jose.jwt.encode(claims, key, algorithm=...)`.
- No usar `python-jose` bajo ningún concepto, ni siquiera como dependencia transitiva.

#### Alternativas consideradas

- **python-jose:** Descartado por CVE-2024-33663 activa.
- **authlib:** Más completo (OAuth 2.0, OIDC) pero con mayor superficie de ataque. Innecesario para el MVP.

---

## Template para nuevas decisiones

Copiar y rellenar para cada nueva decisión:

```markdown
## ADR-XXX

### Título de la decisión

**Fecha:** [mes año]
**Estado:** [Propuesta | Aceptada | Rechazada | Reemplazada por ADR-XXX]

#### Contexto

¿Qué situación llevó a tomar esta decisión? ¿Qué opciones existían?

#### Decisión

¿Qué se decidió hacer exactamente?

#### Razones

- Razón 1
- Razón 2
- Razón 3

#### Consecuencias

- ¿Qué implica esta decisión? ¿Qué se gana y qué se pierde?
- ¿Hay deuda técnica introducida?
- ¿Hay pasos de seguimiento necesarios?

#### Alternativas consideradas

- **Alternativa A:** Por qué se descartó.
- **Alternativa B:** Por qué se descartó.
```
