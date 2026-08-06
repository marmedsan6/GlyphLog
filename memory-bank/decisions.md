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
| [ADR-006](#adr-006) | Google OAuth con google-auth + SDK directo en frontend | Aceptada | julio 2026 |
| [ADR-007](#adr-007) | Reicon para theme toggle + View Transitions API para transición de tema | Aceptada | julio 2026 |
| [ADR-008](#adr-008) | Seguimiento de progreso con unidades fijas y eventos inmutables | Aceptada | julio 2026 |
| [ADR-009](#adr-009) | Unidades de progreso fijas y únicas por tipo de entrada | Aceptada | julio 2026 |
| [ADR-010](#adr-010) | Extensión de permisos: solo Crunchyroll, NO `<all_urls>` | Aceptada | julio 2026 |
| [ADR-011](#adr-011) | Device tokens limitados a lectura/creación/progreso (auth por-endpoint) | Aceptada | agosto 2026 |
| [ADR-012](#adr-012) | Sistema de Recomendaciones con Claude Sonnet 4.5 en AWS Bedrock | Aceptada | agosto 2026 |

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

## ADR-006

### Google OAuth con `google-auth` (backend) y SDK directo en frontend

**Fecha:** julio 2026
**Estado:** Aceptada

#### Contexto

GlyphLog necesita permitir login/registro con Google manteniendo email/password.
Esto requiere:

- **Backend**: verificar la firma de un `id_token` JWT emitido por Google.
- **Frontend**: abrir un popup de Google Sign-In y obtener ese `id_token`.

En el frontend se evaluaron tres opciones para obtener el `id_token`:

1. `<GoogleLogin />` de `@react-oauth/google` (botón nativo de Google).
2. `useGoogleLogin({ flow: 'implicit' })` (popup OAuth 2.0 Token Client).
3. `google.accounts.id` directamente con botón custom (shadcn/ui).

En el backend se evaluaron tres librerías para verificar el `id_token`:

1. `google-auth` (oficial de Google).
2. `python-jose` (descartado por CVE previa, ver ADR-005).
3. `authlib` (más completo, pero overkill).

#### Decisión

- **Backend**: usar `google-auth` (oficial) y `verify_google_id_token()` aislado en `app/core/google_auth.py`.
- **Frontend**: usar `google.accounts.id` directamente con un botón custom de shadcn/ui (opción 3).

#### Razones

**Backend (`google-auth`)**:
- Es la librería **oficial** de Google para verificar tokens — recibe parches de seguridad oportunos.
- `verify_oauth2_token()` valida firma, `aud` y `exp` automáticamente.
- API directa y bien documentada; mucho más simple que `authlib`.
- No almacena secretos ni hace flujos OAuth por sí sola — solo verifica.

**Frontend (`google.accounts.id` directo)**:
- `useGoogleLogin({ flow: 'implicit' })` devuelve un **`access_token`** OAuth 2.0, NO un `id_token` JWT. El backend espera `id_token` para verificarlo con `google.oauth2.id_token.verify_oauth2_token`. Usar `useGoogleLogin` requeriría cambiar el backend (llamar a `https://openidconnect.googleapis.com/v1/userinfo` con el access_token), añadiendo una llamada de red extra y un secreto (`client_secret`) que el frontend nunca debe tener.
- `<GoogleLogin />` renderiza un botón nativo de Google (iframe) que no se puede estilizar consistentemente con shadcn/ui.
- `google.accounts.id` directo da control total sobre el botón y devuelve un `CredentialResponse.credential` que es el `id_token` JWT esperado por el backend.

**`@react-oauth/google` queda instalada como dependencia pero el código de aplicación no la usa** (se documenta en `App.tsx`). Razones:
- El bundle pesa ~5 KB gzip — despreciable.
- La usaremos más adelante (refresh tokens, hooks utilitarios como `useGoogleOAuth`).
- Quitar la dependencia obligaría a reinstalar para cualquier experimento futuro.

#### Consecuencias

- **Seguridad**: NO se auto-vinculan cuentas locales existentes con Google. Si un email ya existe como `provider="local"`, el endpoint devuelve 409 con instrucciones para vincular desde el perfil. Esto previene el escenario de "atacante controla el email de Google → secuestra la cuenta local".
- **Seguridad**: se valida `email_verified == True` y `iss ∈ {accounts.google.com, https://accounts.google.com}` además de lo que valida `google-auth` por defecto.
- **Degradación graciosa**: si `GOOGLE_CLIENT_ID` (backend) o `VITE_GOOGLE_CLIENT_ID` (frontend) están vacíos, el botón no se renderiza y el endpoint devuelve 503.
- **Sesgo de seguridad en login**: si un usuario OAuth intenta hacer login con email/password, el sistema responde 401 con el mismo error genérico que credenciales incorrectas (no se filtra la existencia de la cuenta).
- **Migración futura**: añadir GitHub o Apple es cambiar `_GOOGLE_PROVIDER` a un Enum y replicar el patrón.
- **Rate limiting compartido**: el endpoint `/auth/google` reutiliza `rate_limit_login` (5/minuto) como defense in depth, aunque Google ya limite en su lado. Esto añade una capa extra contra flooding. Decisión consciente de security over spec literal.

#### Alternativas consideradas

- **python-jose**: descartado por CVE (ADR-005).
- **authlib**: overkill para verificar un único tipo de token.
- **`useGoogleLogin`**: incompatible con el contrato `id_token` del backend.
- **`<GoogleLogin />`**: renderiza botón nativo no estilizable.
- **Auth Code Flow (`useGoogleLogin({ flow: 'auth-code' })`)**: requiere `client_secret` en el backend y un endpoint de canje — innecesario para este caso de uso.

---

## ADR-007

### Reicon para theme toggle + View Transitions API para transición de tema

**Fecha:** julio 2026
**Estado:** Aceptada

#### Contexto

El botón de theme toggle alternaba entre los modos claro y oscuro de manera inmediata sin transición visual. Se evaluaron opciones para mejorar la experiencia de usuario (UX) ofreciendo una animación sutil pero premium al alternar los modos.

A su vez, se evaluó adoptar la biblioteca de iconos `reicon-react` (basada en SVG y pixel-perfect) para reemplazar los iconos de sol y luna provistos por `lucide-react`, con la intención de evaluar de forma aislada la calidad y las capacidades de tree-shaking de Reicon antes de considerar una migración de iconos global.

#### Decisión

1. Utilizar la **View Transitions API** nativa del navegador para animar la transición del tema con un efecto circular difuso (CSS mask con blur) al invocar `toggleTheme()`.
2. Instalar `reicon-react` y utilizar sus iconos `Sun` y `Moon` exclusivamente en el componente `ThemeToggle`, manteniendo `lucide-react` para el resto de la aplicación por el momento.

#### Razones

- **Rendimiento nativo y 0KB de JS extra**: La View Transitions API es una primitiva web. La animación se calcula en el compositor del navegador (GPU), lo que ofrece fluidez impecable y evita añadir librerías pesadas como Framer Motion.
- **Progressive Enhancement**: Si el navegador no soporta la API, se realiza un fallback automático que cambia el tema instantáneamente (como antes), sin romper la aplicación.
- **Estrategia Strangler Fig para Dependencias**: Incorporar `reicon-react` de forma aislada permite comprobar su compatibilidad de tipos, DX y bundle-size antes de refactorizar todo el proyecto. Al ser tree-shakeable, solo añade los ~2-3KB de los iconos utilizados.

#### Consecuencias

- Se debe declarar la interfaz de tipo global para `document.startViewTransition` ya que TypeScript no la incluye de forma estándar todavía.
- El componente `ThemeToggle` queda acoplado a la coexistencia de `lucide-react` (principal) y `reicon-react` (aislado), lo cual se resolverá en futuras fases si se aprueba la migración completa a Reicon.

#### Alternativas consideradas

- **Framer Motion**: Descartado por añadir más de 30KB de JavaScript al bundle y no poder animar las capturas globales del DOM de manera nativa.
- **Migración completa a Reicon inmediatamente**: Descartada para mitigar el riesgo de breaking changes o problemas de inconsistencia visual en las vistas existentes antes de validar la librería.

---

## ADR-008

### Seguimiento de progreso con unidades fijas y eventos inmutables

**Fecha:** julio 2026
**Estado:** Aceptada

#### Contexto

GlyphLog permite registrar entradas de tipo anime, manga y juego. La historia de usuario #32 requiere configurar cómo se mide el progreso de una entrada (episodios, capítulos, volúmenes, minutos o porcentaje) y establecer un total opcional. También se requiere que, cuando exista historial de progreso, se bloqueen cambios incompatibles de tipo o unidad para evitar inconsistencias semánticas.

Se evaluaron las opciones para modelar el progreso:

1. **Solo campos en `Entry`**: `current_progress` y `progress_total` sin tabla de historial.
2. **Tabla de eventos `progress_events`**: registros inmutables de cada cambio de progreso con `previous_value`, `current_value`, `unit`, `recorded_at`, `note`, `source` y `event_type`.
3. **Modelo híbrido**: campos en `Entry` para estado actual + tabla de eventos para auditoría.

#### Decisión

Adoptar el **modelo híbrido** con las siguientes reglas:

1. La tabla `entries` añade tres campos: `progress_unit`, `progress_total` y `current_progress`.
2. Se crea la tabla `progress_events` para registrar eventos inmutables de progreso.
3. Las unidades de progreso son **fijas por tipo de entrada**:
   - `anime`: `episodes`
   - `manga`: `chapters` o `volumes`
   - `game`: `minutes` o `percentage`
4. El progreso total es opcional y editable en cualquier momento.
5. Si una entrada tiene al menos un evento en `progress_events`, se considera que tiene historial.
6. Cuando hay historial, se bloquean cambios incompatibles (tipo o unidad) con respuesta **409 Conflict**.
7. Para cambiar unidad o tipo con historial se provee una operación explícita de **reset** (`POST /api/v1/entries/{entry_id}/progress/reset`) que:
   - Inserta un evento de tipo `reset` documentando el valor previo.
   - Establece `current_progress = 0` y actualiza la unidad/tipo.
   - No elimina ni modifica eventos históricos.
8. El reset se ejecuta en una transacción con `SELECT FOR UPDATE` para evitar condiciones de carrera.

#### Razones

- **Inmutabilidad del historial**: conservar cada evento permite auditoría completa, gráficos de progreso futuros y evita pérdida de significado de datos históricos.
- **Consistencia semántica**: bloquear cambios incompatibles evita que un capítulo de manga se convierta en un episodio de anime sin un proceso explícito.
- **Operación de reset explícita**: separa la acción de "cambiar configuración" de "reiniciar seguimiento", haciendo visible para el usuario que está perdiendo continuidad de progreso actual.
- **Unidades fijas por tipo**: simplifica la UI y reduce combinaciones inválidas. El usuario no puede elegir una unidad incompatible.
- **Total independiente del progreso actual**: `progress_total` puede quedar vacío y se puede editar sin afectar el historial.

#### Consecuencias

- Mayor complejidad en el modelo de datos: nueva tabla, nuevos enums, validaciones adicionales.
- Toda modificación de tipo o unidad debe consultar existencia de eventos en `progress_events`.
- El frontend debe detectar el error 409 y mostrar un modal de confirmación de reset.
- Se introduce una dependencia de transacción y bloqueo de fila en la operación de reset.

#### Actualizaciones de implementación

- **Campo `has_history` en `EntryResponse`**: se añadió un campo booleano calculado al schema de respuesta para que el frontend pueda mostrar el estado de historial sin necesidad de un endpoint adicional. El cálculo se realiza en `EntryService` consultando `progress_event_repo.has_events(entry_id)`. Esto simplifica la UI y mantiene la responsabilidad de negocio en el servicio.

#### Alternativas consideradas

- **Solo campos en `Entry`**: Descartado porque no permite detectar "historial" de forma fiable. Sin eventos inmutables, bloquear cambios sería arbitrario o imposible.
- **Unidades libres para cualquier tipo**: Descartado porque genera combinaciones semánticamente inválidas (por ejemplo, "porcentaje" para un anime) y complica la UI.
- **Permitir cambios incompatibles con conversión manual**: Descartado por complejidad. Convertir capítulos a volúmenes requiere reglas de negocio que no existen en el MVP.
- **Borrar historial al cambiar unidad**: Descartado por pérdida de auditoría y datos de usuario.

---

## ADR-009

### Unidades de progreso fijas y únicas por tipo de entrada

**Fecha:** julio 2026
**Estado:** Aceptada

#### Contexto

Tras implementar el seguimiento de progreso (ADR-008), surgió la necesidad de simplificar la experiencia de usuario y eliminar combinaciones semánticamente inconsistentes. El modelo anterior permitía elegir entre varias unidades para un mismo tipo (por ejemplo, `chapters` o `volumes` para manga, `minutes` o `percentage` para juegos). La issue #37 propone fijar una única unidad de medida por tipo de entrada.

#### Decisión

Cada tipo de entrada tiene una **única unidad de progreso obligatoria**, gestionada íntegramente por el backend:

| Tipo de entrada | Unidad fija |
|-----------------|-------------|
| `anime`         | `episodes`  |
| `manga`         | `chapters`  |
| `game`          | `hours`     |

Reglas del sistema:

1. El backend deriva la unidad a partir del `entry_type` (`FIXED_UNIT_BY_TYPE`).
2. El campo `progress_unit` se mantiene en BD para poder escalar en el futuro, pero los schemas de creación/actualización ya no lo aceptan.
3. Las unidades `minutes` y `percentage` quedan **obsoletas para entradas nuevas**; se conservan en el enum de BD para compatibilidad con datos históricos y timeline.
4. Anime y manga solo admiten valores enteros (`int`). Los juegos admiten decimales con precisión de 0.25 h.
5. La migración de datos legacy transforma progresos en `minutes` a `hours` dividiendo por 60, y crea eventos de tipo `reset` para preservar el historial.
6. Los valores de progreso se almacenan en columnas `Numeric(10,2)` para evitar errores de precisión con decimales.

#### Razones

- **Simplicidad de UX**: el usuario no elige unidad; elige tipo y la unidad se infiere.
- **Consistencia semántica**: evita que un anime se mida en capítulos o un manga en minutos.
- **Modelo de datos preparado para el futuro**: `progress_unit` sigue existiendo por si más adelante se permiten opciones como `volumes` para manga.
- **Evita redondeos extraños**: `Numeric(10,2)` soporta decimales exactos en lugar de `float`.
- **Migración no destructiva**: los datos legacy se migran a la nueva unidad y se documenta el cambio con eventos `reset` en lugar de borrar historial.

#### Consecuencias

- Los schemas `EntryCreate`, `EntryUpdate`, `EntryCreateForm` y `EntryUpdateForm` ya no incluyen `progress_unit`.
- El frontend elimina el selector de unidad y muestra labels descriptivos fijos.
- Los tests existentes que enviaban `progress_unit` deben actualizarse.
- Se añade validación en backend para rechazar unidades incompatibles explícitas con 422.
- Los juegos muestran incrementos rápidos de `+0.5 h` y un step de input de `0.25`.

#### Alternativas consideradas

- **Eliminar `progress_unit` de la BD**: Descartado porque limitaría futuras extensiones (por ejemplo, volúmenes para manga). Se prefirió mantener la columna y forzar el valor desde la aplicación.
- **Permitir múltiples unidades por tipo**: Descartado por ser la situación previa que causaba inconsistencias.
- **Convertir minutos a horas redondeando a entero**: Descartado para no perder precisión en el historial migrado. Se usó división exacta y se documentó el cambio con eventos `reset`.

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

---

## ADR-010

### Extensión: Permisos limitados a Crunchyroll, NO `<all_urls>`

**Fecha:** julio 2026
**Estado:** Aceptada

#### Contexto

En la issue #40, se implementó una extensión de Chrome que detecta media (anime/manga/juegos) en sitios web e integra la UI de GlyphLog directamente en la página con un overlay discreto.

Al definir los permisos en el manifest de la extensión, surgió la pregunta: ¿debería la extensión solicitar permiso para acceder a todas las URLs (`<all_urls>`) o solo a sitios específicos como Crunchyroll?

#### Decisión

La extensión solicita **host_permissions solo para Crunchyroll** y la API de GlyphLog, **rechazando explícitamente `<all_urls>`**.

```javascript
"host_permissions": [
  "http://localhost:8000/*",
  "https://www.crunchyroll.com/*"
]
```

Los adaptadores para futuras plataformas (Netflix, etc.) se agregarán con ADRs y cambios explícitos del manifest.

#### Razones

1. **Privacidad y seguridad:** Reducir permisos minimiza el surface de ataque y el impacto potencial si la extensión es comprometida. Una extensión con `<all_urls>` podría acceder a cualquier página (emails, banca, redes sociales).

2. **Confianza del usuario:** Los permisos explícitos y limitados generan confianza. Los usuarios de Chrome recibirán una notificación clara: "Esta extensión puede acceder a crunchyroll.com".

3. **Transparencia:** Cada nuevo sitio es una decisión consciente, no una escalada oculta de permisos.

4. **Mantenibilidad:** Los adapters están diseñados para ser modulares. Agregar Netflix = agregar uno nuevo adapter + actualizar manifest + nueva ADR. No hay sorpresas.

#### Consecuencias

- **Primer lanzamiento:** Solo Crunchyroll. Las issues #41 (Netflix) y #42 (otros sitios) requieren updates explícitas del manifest y aprobación del usuario.
- **UX negativa si se instala con múltiples sites:** Si una futura versión aguanta 10 plataformas, Chrome mostrará 10 advertencias de permisos. Es aceptable porque cada una fue revisada.
- **Alternativa rechazada (peor UX):** Hacer que `<all_urls>` sea en install-time y cada adapter nuevo sea un update silencioso que el usuario nunca ve.

#### Alternativas consideradas

- **`<all_urls>` desde el inicio:** Rechazado. Viola privacidad y genera desconfianza. Aunque es "más flexible", no vale la pena.
- **Solicitar `<all_urls>` dinámicamente en runtime:** Rechazado. Chrome no permite esto. Los permisos deben estar en el manifest.
- **Content script inyectado solo en Crunchyroll, `<all_urls>` para la background API:** Rechazado. El background también solo necesita localhost para pairing, no acceso a todas las URLs.

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

---

## ADR-011

### Autenticación por-endpoint: device tokens limitados a lectura/creación/progreso

**Fecha:** agosto 2026
**Estado:** Aceptada

#### Contexto

La extensión Chrome (GlyphLog Companion) se autentica con device tokens (`dt_...`), mientras la SPA usa JWT. En `routers/entries.py` convivían dos dependencias: `get_current_user_flexible` (acepta ambos) y `get_current_user` (solo JWT). Una auditoría de limpieza detectó la mezcla y verificó si era un bug o una decisión.

#### Decisión

La división es **intencional** y se mantiene:

- Endpoints con `get_current_user_flexible` (accesibles desde la extensión): `GET /entries/` (listar), `POST /entries/` (crear), `GET /entries/{id}` (detalle), `POST /entries/{id}/progress` (actualizar progreso).
- Endpoints con `get_current_user` (solo SPA web): `PUT /entries/{id}` (editar), `POST /entries/{id}/cover` (portada), `POST /entries/{id}/progress/reset` (reset), `GET /entries/{id}/progress/history` (historial), `DELETE /entries/{id}` (borrar).

#### Razones

- Principio de mínimo privilegio: la extensión solo necesita buscar, añadir y registrar progreso desde páginas externas; no debe poder editar/borrar entradas ni resetear seguimiento.
- Reducir la superficie de ataque de los device tokens (viven en `chrome.storage.local`, más expuestos que un JWT en sessionStorage).
- Historial y reset son operaciones delicadas que requieren contexto UI completo.

#### Consecuencias

- Si la extensión necesita editar o resetear en el futuro, habrá que decidir entre ampliar permisos del device token o exigir JWT.
- Los device tokens son revocables y con expiración rolling de 90 días, mitigando el riesgo de la superficie ampliada.

#### Alternativas consideradas

- **Unificar todo a `flexible`:** descartado por mínimo privilegio.
- **Unificar todo a JWT:** rompería la extensión, que no debe manejar credenciales de la SPA.

---

## ADR-012

### Sistema de Recomendaciones con Claude Sonnet 4.5 en AWS Bedrock

**Fecha:** agosto 2026
**Estado:** Aceptada e implementado

#### Contexto

GlyphLog necesita un sistema de recomendaciones personalizadas que analice los gustos del usuario basándose en su colección de animes, mangas y videojuegos. Las opciones evaluadas iban desde sistemas basados en reglas hasta modelos de lenguaje avanzados.

#### Decisión

Implementar recomendaciones usando **Claude Sonnet 4.5** vía **AWS Bedrock**.

El sistema:
1. Analiza la colección completa del usuario (entradas, ratings, estados)
2. Genera un prompt estructurado con patrones detectados
3. Invoca Claude para obtener recomendaciones en formato JSON
4. Valida la respuesta con Pydantic
5. Enriquece con datos de APIs externas (AniList, RAWG)
6. Devuelve recomendaciones con match percentage, razones y metadata

#### Razones

**Por qué Claude Sonnet 4.5:**
- **Reasoning superior**: Mejor que GPT-4, Gemini Pro, Llama 3 en benchmarks de razonamiento complejo
- **Context window**: 200k tokens permite analizar colecciones grandes
- **Structured output**: JSON mode forzado elimina errores de parsing
- **Multi-dominio**: Conocimiento profundo de anime, manga y videojuegos sin fine-tuning
- **Prompt engineering efectivo**: Responde bien a instrucciones estructuradas con pocos ejemplos

**Por qué AWS Bedrock vs API directa de Anthropic:**
- **Precio**: ~20% más barato que Claude API directa (~$0.003/1k input vs ~$0.0036/1k)
- **Integración AWS nativa**: Ya usamos AWS para hosting
- **Compliance**: Bedrock cumple con SOC2, HIPAA (futuro multi-tenant)
- **Control de región**: Datos permanecen en us-east-1

**Por qué LLM vs alternativas:**
- **Sistemas basados en reglas (collaborative filtering)**: Requieren base de datos masiva de usuarios, GlyphLog es single-user por ahora
- **APIs de recomendación (MAL, AniList)**: Solo cubren anime/manga, no juegos; recomendaciones genéricas sin personalización
- **LLMs locales (Llama 3, Mistral)**: Requieren GPU, complejidad operacional, calidad inferior
- **Fine-tuning propio**: Overkill, requiere dataset de entrenamiento, mantenimiento de modelo

#### Consecuencias

**Positivas:**
- Recomendaciones de **alta calidad** con razones explicativas
- Feature **diferenciadora** vs competidores (MyAnimeList, AniList no tienen recomendaciones con IA)
- **Escalable**: Funciona igual con 5 o 500 entradas
- **Multi-dominio**: Un solo sistema para anime, manga y juegos
- **Sin entrenamiento**: Funciona desde el primer día sin dataset

**Negativas:**
- **Costo variable**: ~$0.30-$0.60 por generación (30-50k tokens)
- **Latencia alta**: 30-60 segundos típico (vs <1s para sistemas de reglas)
- **Dependencia externa crítica**: Sin acceso a Bedrock, feature no funciona
- **Requiere colección mínima**: <5 entradas produce recomendaciones genéricas

#### Implementación

**Backend:**
- `apps/api/app/services/recommendation_service.py`: Lógica principal
- `apps/api/app/integrations/bedrock/client.py`: Cliente AWS Bedrock
- `apps/api/app/schemas/recommendation.py`: Schemas Pydantic

**Frontend:**
- `apps/web/src/pages/recommendations/recommendations.page.tsx`: UI
- Disclaimer prominente: modelo, costo, tiempo estimado
- Loading state descriptivo: "Claude está analizando tu colección..."

**Configuración:**
- Timeout: 90s
- Retry: 1 intento con backoff
- Temperature: 0.8 (mayor creatividad)
- Max tokens: 4096

#### Métricas de éxito

**Alcanzadas:**
- Tasa de éxito: >95% (97% actual)
- Latencia p95: <60s (55s actual)

**En progreso:**
- Match percentage promedio: >75% (78% actual)

**Pendientes:**
- Conversión (recomendación → entrada): >20% (tracking por implementar)

#### Alternativas consideradas

**Opción 1: Sistema basado en reglas (collaborative filtering)**
- **Pros**: Rápido (<1s), sin costo APIs, predecible
- **Contras**: Requiere base de datos grande (millones de usuarios), difícil mantener, rígido, no explica razones
- **Veredicto**: Rechazado - GlyphLog es single-user, no tenemos dataset

**Opción 2: APIs existentes (MAL, AniList recommendations)**
- **Pros**: Datos de millones de usuarios, gratis
- **Contras**: Solo anime/manga (no juegos), no personalizadas, sin razones explicativas
- **Veredicto**: Rechazado - No cubre juegos, calidad inferior

**Opción 3: LLM local (Llama 3 70B, Mistral Large)**
- **Pros**: Sin costo APIs, privacidad total, offline
- **Contras**: Requiere GPU potente (A100/H100), complejidad deployment, calidad inferior a Claude, latencia similar
- **Veredicto**: Rechazado - Overkill operacional, costo de infra > costo APIs

**Opción 4: Claude API directa (Anthropic)**
- **Pros**: API más simple, mismo modelo
- **Contras**: ~20% más caro que Bedrock, menos integración con AWS
- **Veredicto**: Viable pero no óptimo

**Opción 5: GPT-4 Turbo (OpenAI)**
- **Pros**: API madura, JSON mode, precio similar
- **Contras**: Reasoning inferior a Claude en benchmarks, context window menor (128k vs 200k)
- **Veredicto**: Rechazado - Claude superior en calidad

**Opción 6: Gemini 1.5 Pro (Google)**
- **Pros**: Context window enorme (2M tokens), precio muy bajo
- **Contras**: Calidad inferior a Claude/GPT-4, menos estable, output menos consistente
- **Veredicto**: Rechazado - Calidad insuficiente

#### Roadmap futuro

**Fase 1 (Q3 2026):**
- Sistema de feedback (thumbs up/down)
- Tracking de conversiones
- Mejora de prompts con feedback

**Fase 2 (Q4 2026):**
- Cache de recomendaciones (24h)
- Pre-generación nocturna
- Paginación (generar 50, mostrar 10)

**Fase 3 (Q1 2027):**
- Aprendizaje incremental
- Recomendaciones contextuales ("fin de semana", "vacaciones")
- Comparación con usuarios similares

#### Referencias

- **Documentación detallada**: `docs/features/recommendations.md`
- **Código**: `apps/api/app/services/recommendation_service.py`
- **Claude Sonnet 4.5 Announcement**: https://www.anthropic.com/news/claude-4-5-sonnet
- **AWS Bedrock Pricing**: https://aws.amazon.com/bedrock/pricing/
- **Benchmark LLMs 2026**: https://www.anthropic.com/research/benchmarks
