# 🎓 Guía de Entrevistas y Conceptos Clave — GlyphLog

Esta guía centraliza los conceptos de diseño, arquitectura, seguridad e infraestructura aplicados en GlyphLog. Está diseñada para ayudarte a repasar rápidamente el proyecto y defender tus decisiones técnicas en entrevistas de trabajo para perfiles Junior-Mid.

---

## 📌 Índice de Búsqueda Rápida

1. [Arquitectura y Capas del Sistema](#1-arquitectura-y-capas-del-sistema)
   * [1.1 El flujo de dependencias en el Backend](#11-el-flujo-de-dependencias-en-el-backend)
   * [1.2 Server State vs UI State en el Frontend](#12-server-state-vs-ui-state-en-el-frontend)
2. [Gestión de Configuración y Entornos](#2-gestión-de-configuración-y-entornos)
   * [2.1 Principio de 12-Factor App](#21-principio-de-12-factor-app)
   * [2.2 Inyección en Build-Time vs Runtime](#22-inyección-en-build-time-vs-runtime)
   * [2.3 Degradación Graciosa](#23-degradación-graciosa)
3. [Asincronía y Concurrencia](#3-asincronía-y-concurrencia)
   * [3.1 Consultas concurrentes en APIs externas](#31-consultas-concurrentes-en-apis-externas)
   * [3.2 Control de Rate Limits con Caché local](#32-control-de-rate-limits-con-caché-local)
4. [Seguridad y Autenticación](#4-seguridad-y-autenticación)
   * [4.1 Flujo de Google OAuth de extremo a extremo](#41-flujo-de-google-oauth-de-extremo-a-extremo)
   * [4.2 Storage de JWT en el Cliente](#42-storage-de-jwt-en-el-cliente)
   * [4.3 Hashing de Contraseñas y Seguridad de Base de Datos](#43-hashing-de-contraseñas-y-seguridad-de-base-de-datos)
5. [Infraestructura y Despliegues](#5-infraestructura-y-despliegues)
   * [5.1 Contenerización con Docker](#51-contenerización-con-docker)
   * [5.2 Proxy Reverso con Nginx](#52-proxy-reverso-con-nginx)
6. [Preguntas de Entrevista Q&A (Respuestas Estrella)](#6-preguntas-de-entrevista-qa-respuestas-estrella)
   * [P1: El Bug de RAWG en producción (Variables de Entorno)](#p1-el-bug-de-rawg-en-producción-variables-de-entorno)
   * [P2: Concurrencia y fallos parciales en APIs de terceros](#p2-concurrencia-y-fallos-parciales-en-apis-de-terceros)
   * [P3: Seguridad en JWT (sessionStorage vs Cookies HttpOnly)](#p3-seguridad-en-jwt-sessionstorage-vs-cookies-httponly)
   * [P4: ¿Por qué usar FastAPI en lugar de Django/Express?](#p4-por-qué-usar-fastapi-en-lugar-de-djangoexpress)
   * [P5: Estrategia de testing en arquitecturas desacopladas](#p5-estrategia-de-testing-en-arquitecturas-desacopladas)

---

## 1. Arquitectura y Capas del Sistema

### 1.1 El flujo de dependencias en el Backend
En GlyphLog seguimos una arquitectura por capas estricta:

```
Petición HTTP ──> Router (FastAPI) ──> Service ──> Repository ──> Base de Datos (PostgreSQL)
```

*   **Router:** Valida los datos de entrada (utilizando Pydantic), gestiona la cabecera HTTP/Auth y define los códigos de estado. No sabe nada de SQL ni de lógica de negocio compleja.
*   **Service:** Contiene la lógica de negocio (por ejemplo, comprobar si un recurso está duplicado o combinar datos de APIs externas). Es agnóstico del framework HTTP y del motor de base de datos.
*   **Repository:** Centraliza las consultas de base de datos usando SQLAlchemy. Esto facilita cambiar el ORM o mockear la BD en los tests.

> **Tradeoff:** Escribir esta estructura añade más boilerplate (más archivos y clases por endpoint), pero a cambio obtenemos un código altamente testeable y desacoplado, fácil de mantener a medida que el equipo crece.

### 1.2 Server State vs UI State en el Frontend
*   **UI State:** Estado local de la interfaz (un modal abierto, filtros seleccionados, buscador actual). Lo gestionamos con React `useState` o la URL (`useSearchParams`).
*   **Server State:** Datos cacheados que pertenecen a la base de datos (entradas del usuario, detalles). En lugar de usar `useEffect` y guardarlo en un estado global (como Zustand), usamos **TanStack Query (React Query)**. Esto nos da manejo de caché automático, estados de carga/error incorporados e invalidación inteligente.

---

## 2. Gestión de Configuración y Entornos

### 2.1 Principio de 12-Factor App
El código base es exactamente el mismo en desarrollo, staging y producción. Las diferencias de comportamiento se gestionan inyectando variables de entorno (`.env` local vs `.env.production` en el servidor).

### 2.2 Inyección en Build-Time vs Runtime
*   **Backend (Python/Docker):** Las variables de entorno se leen en **runtime**. Puedes cambiar una variable en la máquina del servidor y con reiniciar el contenedor de la API basta para que se aplique.
*   **Frontend (React/Vite):** Las variables `VITE_*` se inyectan en **build-time** (cuando se compila el código a JavaScript estático). Si cambias una variable de Vite en producción, es obligatorio **reconstruir el contenedor de Nginx** para compilar el nuevo bundle con las variables incrustadas.

### 2.3 Degradación Graciosa
Si una API Key o servicio de autenticación no está configurado (ej: `RAWG_API_KEY` o `GOOGLE_CLIENT_ID` vacíos), la aplicación no debe crashear al arrancar. El código comprueba si la llave está vacía y deshabilita la característica amigablemente, devolviendo resultados vacíos u ocultando el botón.

---

## 3. Asincronía y Concurrencia

### 3.1 Consultas concurrentes en APIs externas
Cuando el usuario busca en GlyphLog, consultamos APIs de terceros en paralelo:

```python
# Hacemos llamadas concurrentes a AniList y RAWG
async with httpx.AsyncClient() as client:
    tasks = [
        self.anilist_client.search_anime_manga(client, query),
        self.rawg_client.search_games(client, query),
    ]
    responses = await asyncio.gather(*tasks, return_exceptions=True)
```
*Usar `return_exceptions=True` asegura que si una llamada falla (timeout, rate limit), la otra llamada se ejecute y devuelva datos al usuario sin lanzar una excepción global.*

### 3.2 Control de Rate Limits con Caché local
Para proteger nuestra aplicación contra bloqueos por exceso de peticiones (Rate Limiting) de APIs públicas de terceros, implementamos un `MemoryCache` con un TTL (Time-to-Live) de 5 minutos en el backend. Si dos usuarios buscan el mismo título seguido, la segunda petición no consume cuota de la API externa y se resuelve instantáneamente.

---

## 4. Seguridad y Autenticación

### 4.1 Flujo de Google OAuth de extremo a extremo
1.  El usuario hace clic en "Continuar con Google".
2.  El frontend interactúa con Google Identity Services y obtiene un `id_token` (un JWT firmado por Google).
3.  El frontend envía ese `id_token` al backend (`POST /api/v1/auth/google`).
4.  El backend **valida la firma del token** usando la librería oficial de Google (`google-auth`) y verifica el campo `client_id`.
5.  Si el usuario no existe, se crea; si existe, el backend le expide un **JWT propio de GlyphLog** que se usará para autorizar las peticiones subsiguientes.

### 4.2 Storage de JWT en el Cliente
En el MVP guardamos el token JWT en `sessionStorage`:
*   *Ventaja:* Sobrevive a las recargas de página (F5) pero se destruye automáticamente al cerrar la pestaña, reduciendo el radio de exposición del token.
*   *Desventaja:* Sigue siendo accesible mediante JavaScript (vulnerable a XSS). La mejora Senior es migrar a cookies `HttpOnly` y `Secure`, donde el navegador maneja el token automáticamente y JavaScript no puede leerlo.

### 4.3 Hashing de Contraseñas y Seguridad de Base de Datos
*   Las contraseñas de los usuarios locales se hashean usando **Bcrypt** con sal única antes de almacenarse en la columna `hashed_password`. Nunca guardamos contraseñas en texto plano.
*   Para usuarios registrados con Google OAuth, la columna `hashed_password` queda como `NULL` y se valida la identidad mediante las columnas `provider` y `provider_id`.

---

## 5. Infraestructura y Despliegues

### 5.1 Contenerización con Docker
Usamos Docker para garantizar consistencia entre entornos. 
*   **Desarrollo:** Docker Compose monta el código local como un volumen para permitir live-reload y expone la base de datos PostgreSQL localmente en el puerto `5432`.
*   **Producción:** La imagen de la API copia el código dentro del contenedor y no expone el puerto de PostgreSQL al host por razones de seguridad. Todo se ejecuta detrás de una red privada virtual de Docker.

### 5.2 Proxy Reverso con Nginx
En producción, Nginx actúa como proxy reverso y servidor de estáticos:
*   Sirve directamente el build estático de React (máxima velocidad).
*   Redirige las peticiones que empiezan por `/api/v1/` al contenedor de FastAPI en el puerto `8000`.
*   Sirve las imágenes de portadas locales desde la carpeta `/uploads/`.
*   Termina la conexión SSL (HTTPS) con certificados gestionados por Cloudflare.

---

## 6. Preguntas de Entrevista Q&A (Respuestas Estrella)

### P1: El Bug de RAWG en producción (Variables de Entorno)
> **Entrevistador:** "Tuvimos un bug donde la búsqueda de videojuegos fallaba en producción pero funcionaba en local. ¿Cómo lo diagnosticarías y qué arquitectura usarías para evitar que tire abajo la aplicación?"
> 
> **Respuesta:** "Primero, revisaría los logs del contenedor en producción buscando errores de inicialización o llamadas a APIs externas. En este escenario, el problema era que la API Key de un proveedor externo (RAWG) no estaba definida en el archivo de entorno de producción.
>
> Para evitar que esto tire abajo la aplicación, apliqué dos patrones:
> 1. **Degradación Graciosa:** En el cliente de la API, si la clave no está configurada, el código retorna una lista vacía de forma segura en lugar de lanzar una excepción o intentar una petición que devolverá un error 401/403.
> 2. **Aislamiento de Errores concurrentes:** En el servicio agregador, consultamos los catálogos en paralelo usando asincronía (`asyncio.gather` con `return_exceptions=True`). Si una de las APIs falla o carece de credenciales, capturamos el fallo, lo registramos en logs para observabilidad, y permitimos que las APIs que sí están sanas (como AniList) sigan devolviendo resultados al usuario sin interrumpir su flujo."

### P2: Concurrencia y fallos parciales en APIs de terceros
> **Entrevistador:** "Si tienes que consumir múltiples APIs externas de terceros para una sola búsqueda y una de ellas responde con un timeout o rate limit, ¿cómo lo gestionas para no penalizar la UX?"
> 
> **Respuesta:** "Utilizaría asincronía y paralelismo. En lugar de hacer las llamadas secuenciales, las ejecuto concurrentemente usando `asyncio.gather` en Python (o `Promise.allSettled` en JavaScript). Configuro timeouts estrictos en el cliente HTTP (por ejemplo, 5 segundos) para evitar que una API lenta retrase toda la petición.
> 
> Además, establezco el parámetro `return_exceptions=True` para capturar cualquier error de red de forma individual. Si una API falla, su resultado se trata como un set vacío, se registra en logs para diagnóstico, y combinamos las respuestas exitosas de las demás. Adicionalmente, implemento una caché en memoria para almacenar las búsquedas exitosas y no saturar las APIs de terceros en consultas repetidas."

### P3: Seguridad en JWT (sessionStorage vs Cookies HttpOnly)
> **Entrevistador:** "En tu frontend almacenas los JWT en sessionStorage. ¿Qué riesgos de seguridad tiene y cómo los mitigarías en una fase posterior?"
> 
> **Respuesta:** "Almacenar JWT en `sessionStorage` o `localStorage` hace que el token sea accesible mediante scripts de JavaScript (`window.sessionStorage.getItem(...)`). Esto significa que si la app sufre una vulnerabilidad de Cross-Site Scripting (XSS), un atacante podría robar el token.
> 
> Para mitigarlo en producción, la solución estándar es migrar a un flujo basado en cookies. El backend expide el token en una cookie HTTP con las flags `HttpOnly` (que impide que JavaScript acceda al token), `Secure` (fuerza la transmisión solo por HTTPS) y `SameSite=Strict/Lax` (ayuda a mitigar ataques CSRF). El navegador se encarga de adjuntar la cookie automáticamente en cada petición REST sin que el frontend tenga que manejar el token directamente."

### P4: ¿Por qué usar FastAPI en lugar de Django/Express?
> **Entrevistador:** "¿Por qué elegiste FastAPI para el backend de este proyecto en lugar de Django o Express con Node.js?"
> 
> **Respuesta:** "Elegí FastAPI por tres razones clave: rendimiento, validación automática de datos y tipado estricto.
> 
> FastAPI está construido sobre ASGI (Starlette y Uvicorn), lo que le permite ser asíncrono nativo y tener un rendimiento comparable al de Node.js o Go, superando a frameworks WSGI tradicionales como Django.
> 
> Además, la integración nativa de FastAPI con Pydantic v2 resuelve la serialización y validación de datos en una sola línea, autogenerando la documentación interactiva OpenAPI (Swagger) sin necesidad de librerías extra. Esto ahorra mucho tiempo en la comunicación entre el frontend y el backend."

### P5: Estrategia de testing en arquitecturas desacopladas
> **Entrevistador:** "¿Cómo enfocas las pruebas automatizadas en una aplicación full-stack desacoplada como esta?"
> 
> **Respuesta:** "Divido la estrategia en tres niveles:
> 
> 1.  **Tests unitarios y de integración en backend:** Con `pytest`. Usamos una base de datos de pruebas limpia (SQLite o PostgreSQL aislada) y mockeamos las peticiones HTTP externas (usando librerías de simulación como `pytest-mock` o `respx`) para garantizar que los tests sean deterministas, rápidos y no dependan de APIs externas reales.
> 2.  **Tests de componentes y hooks en frontend:** Con `Vitest` y `React Testing Library`, simulando el comportamiento de las APIs REST para verificar que el UI responde correctamente a estados de carga, éxito, vacío y error.
> 3.  **Tests E2E selectivos:** Usando `Playwright` para probar flujos críticos de usuario (como el login con redirecciones y la creación de una entrada) contra un entorno controlado, validando la interacción real del navegador."

---

## 7. Elevator Pitch de Arquitectura (System Design)

En una entrevista, sé capaz de describir GlyphLog en 1 minuto:

> "GlyphLog es un **monorepo gestionado por Turborepo con pnpm workspaces**. El backend es una API REST construida con **FastAPI (Python)**, que sigue un flujo desacoplado **Router (HTTP) → Service (lógica de negocio) → Repository (acceso a BD con SQLAlchemy)**. El frontend es una **SPA con React 18, Vite y TypeScript**, usando **Zustand** para estado global, **React Hook Form + Zod** para formularios, y **TanStack Query** para server state. La infraestructura local (PostgreSQL, SonarQube, API y Web) se orquesta con **Docker Compose**; producción corre en una VM de Oracle Cloud con Nginx + Cloudflare."

---

## 8. Frontend — Preguntas Frecuentes

### 8.1 ¿Por qué Zustand en lugar de Context API?
> **Respuesta Estrella (Senior):** "React Context es una herramienta de inyección de dependencias, no un gestor de estado optimizado. Cada cambio en un Provider re-renderiza **todos** los consumidores. Zustand aporta tres cosas:
> 1. **Selectores reactivos** — el componente se suscribe a rebanadas específicas y solo re-renderiza si cambia lo que seleccionó.
> 2. **Desacoplamiento** — el estado vive fuera del árbol de React, lo que facilita tests unitarios sin montar Providers.
> 3. **Simplicidad** — cero boilerplate comparado con Redux (sin actions/reducers), bundle liviano."

### 8.2 ¿Por qué React Hook Form + Zod en lugar de `useState`?
> **Respuesta Estrella (Senior):** "Gestionar un formulario con `useState` por input re-renderiza todo el componente en cada tecla. **React Hook Form** usa **componentes no controlados** basados en refs: el estado del formulario queda aislado de los renders hasta el submit/validación. **Zod** añade validación declarativa con inferencia de tipos TypeScript, de modo que los errores se detectan en compilación y la validación del cliente coincide con los contratos del backend."

### 8.3 ¿Cómo evitas que la app se rompa si la API cambia? (API Contract)
> **Respuesta Estrella (Senior):** "Uso **API-First**: FastAPI expone el esquema en `/openapi.json`, y en el frontend un script de `openapi-typescript` regenera los tipos (`api.d.ts`). Si el backend cambia un campo en Pydantic, `tsc` detecta el desajuste en compilación, antes de que llegue a producción."

---

## 9. Backend — Preguntas Frecuentes

### 9.1 ¿Por qué `Decimal`/`Numeric` en lugar de `Float`?
> **Respuesta Estrella (Senior):** "Los `Float` sufren imprecisiones binarias IEEE 754 (`0.1 + 0.2 = 0.30000000000000004`). Para datos de negocio (ratings, progreso) uso `Numeric(precision, scale)` en PostgreSQL mapeado a `Decimal` en Python, garantizando aritmética exacta en base decimal — por ejemplo, guardar `8.5` de forma determinista."

### 9.2 ¿Cómo validas subidas de archivos sin dejar basura en disco?
> **Respuesta Estrella (Senior):** "En endpoints `multipart/form-data`, el error común es guardar el archivo y luego validar. En GlyphLog el router valida **primero** el schema Pydantic del texto; solo si es 100% válido persiste la imagen. Además validamos los **magic bytes** (encabezado binario) en memoria antes de escribir, evitando scripts maliciosos con extensión falsa (spoofing)."

---

## 10. Calidad y DevOps

### 10.1 ¿Qué rol tiene SonarQube?
> **Respuesta Estrella (Senior):** "SonarQube es el guardián de calidad estática, local y en CI, que impone un **Quality Gate**. Detecta tres categorías: **code smells** (duplicación, complejidad ciclomática), **bugs potenciales** (promesas sin manejar, imports circulares) y **vulnerabilidades/hotspots** (hashes débiles, secretos en duro, riesgo de SQL injection). Garantiza que la calidad sea un estándar de ingeniería no negociable."
