# 🧠 Apuntes de Estudio para Entrevistas de Trabajo

Este documento recopila las decisiones de ingeniería tomadas en **GlyphLog**, explicadas con el enfoque, vocabulario y rigor técnico que los entrevistadores buscan en candidatos de nivel **Mid y Senior**.

Utiliza estos apuntes para preparar tus defensas de diseño de sistemas y arquitectura frontend/backend.

---

## 🗺️ Arquitectura de la Aplicación (System Design)

En una entrevista, sé capaz de describir la arquitectura de GlyphLog en 1 minuto:

> *"GlyphLog está estructurado como un **Monorepo gestionado por Turborepo con pnpm workspaces**. El backend es un API REST construido con **FastAPI (Python)**, que sigue un flujo desacoplado: **Router (HTTP) → Service (Lógica de negocio) → Repository (Acceso a BD asíncrono con SQLAlchemy)**. El frontend es una **SPA construida con React 18, Vite y TypeScript**, utilizando **Zustand** para la gestión de estado global y **React Hook Form con Zod** para la eficiencia de formularios. Toda la infraestructura local (PostgreSQL, SonarQube, API y Web) está orquestada mediante **Docker Compose** para asegurar entornos herméticos."*

---

## 🎨 1. Frontend (React / TypeScript)

### Tema A: Gestión de Estado (Zustand vs React Context)

*   **La Pregunta del Entrevistador:** *¿Por qué decidiste introducir Zustand en lugar de usar el Context API nativo de React para todo el estado?*
*   **La Respuesta Estrella (Senior):**
    > *"React Context es una herramienta de inyección de dependencias, no un gestor de estado optimizado. Cada vez que cambia un valor dentro de un Provider de Context, **todos** los componentes que consumen ese contexto se re-renderizan, lo que puede causar problemas de rendimiento graves en árboles de componentes grandes.
    >
    > Decidí implementar **Zustand** por tres razones clave:
    > 1.  **Selectores Reactivos:** Permite a los componentes suscribirse únicamente a rebanadas (*slices*) específicas de estado. El componente solo se renderiza si la propiedad seleccionada cambia.
    > 2.  **Desacoplamiento:** El estado se define fuera de la jerarquía de React, facilitando los tests unitarios puros (sin necesidad de montar y envolver componentes en Providers).
    > 3.  **Simplicidad:** Cero boilerplate. No requiere Actions ni Reducers complejos como Redux, manteniendo el bundle liviano."*

### Tema B: Eficiencia en Formularios (React Hook Form + Zod vs useState)

*   **La Pregunta del Entrevistador:** *Veo que usas React Hook Form y Zod en tus formularios. ¿Por qué es mejor que gestionar el estado con múltiples hooks `useState`?*
*   **La Respuesta Estrella (Senior):**
    > *"Gestionar un formulario con `useState` vinculando el valor de cada input al estado local causa **re-renderizaciones en todo el componente por cada tecla pulsada**. En formularios complejos con previews de imágenes, esto degrada drásticamente la experiencia de usuario (UX).
    >
    > **React Hook Form** resuelve esto utilizando **componentes no controlados** basados en refs. El estado del formulario se mantiene aislado de los renders de React hasta que se envía o se valida. 
    > Integrar **Zod** nos da una validación declarativa, con inferencia estática de tipos en TypeScript. Esto asegura que los errores se detecten en tiempo de compilación y que la validación en el cliente coincida exactamente con los contratos requeridos por el backend."*

### Tema C: Integración Frontend-Backend (API Contract)

*   **La Pregunta del Entrevistador:** *¿Cómo gestionas los tipos TypeScript del frontend en relación con los modelos del backend para evitar que la app se rompa si la API cambia?*
*   **La Respuesta Estrella (Senior):**
    > *"Para eliminar la duplicación de código y los errores humanos, implementé un **esquema guiado por contrato (API-First)**. FastAPI en el backend expone automáticamente el esquema formal de la API en `/openapi.json` (auto-documentación).
    > En el frontend, configuré un script con `openapi-typescript` que introspecciona el backend y autogenera una definición tipada estricta (`api.d.ts`). 
    > De esta forma, si el backend modifica un campo o cambia un tipo en Pydantic, el frontend detecta el error en tiempo de compilación (`tsc`), permitiendo solucionar el desajuste antes de que llegue a producción."*

---

## ⚡ 2. Backend (FastAPI / Python / SQL)

### Tema A: Tipo Numérico en SQL (Decimal vs Float)

*   **La Pregunta del Entrevistador:** *En tu modelo de bases de datos para las puntuaciones (rating), veo que usas un tipo `Numeric(3,1)` mapeado como `Decimal` en lugar de un `Float`. ¿A qué se debe esto?*
*   **La Respuesta Estrella (Senior):**
    > *"Los números de punto flotante (`Float`) sufren de imprecisiones de representación binaria bajo el estándar IEEE 754 (ej: `0.1 + 0.2` resulta en `0.30000000000000004`). Para datos de negocio críticos, como precios o métricas de evaluación de productos, esto puede introducir errores de cálculo acumulativos intolerables.
    > Utilizar un tipo **`Numeric(3,1)`** en PostgreSQL mapeado como un objeto **`Decimal`** en Python asegura aritmética de precisión exacta en base decimal (por ejemplo, permitiendo guardar puntuaciones exactas como `8.5` de forma determinista y segura)."*

### Tema B: Seguridad y Mitigación de Ataques de Fuerza Bruta (Rate Limiting)

*   **La Pregunta del Entrevistador:** *¿Cómo proteges tus endpoints de autenticación (Login/Registro) contra ataques de fuerza bruta o de denegación de servicio (DoS)?*
*   **La Respuesta Estrella (Senior):**
    > *"Implementé una estrategia de **Rate Limiting** mediante la biblioteca `slowapi`, que integra límites basados en IP sobre la memoria de la aplicación mediante un limiter singleton.
    > El endpoint de Login está limitado a 5 intentos por minuto por IP, y el de Registro a 3 por minuto. Si se excede, el servidor retorna inmediatamente un status **`429 Too Many Requests`** acompañado de un header `Retry-After`. Esto mitiga los ataques de fuerza bruta al elevar exponencialmente el coste computacional y tiempo para el atacante, además de proteger la base de datos de picos de carga innecesarios."*

### Tema C: Evitar Archivos Huérfanos en Disco (File Upload validation)

*   **La Pregunta del Entrevistador:** *Al subir imágenes de portada para las entradas, ¿cómo evitas almacenar archivos basura si los datos del formulario no son válidos?*
*   **La Respuesta Estrella (Senior):**
    > *"En endpoints de tipo `multipart/form-data` que reciben tanto datos estructurados como un archivo binario, un error común es guardar el archivo en disco inmediatamente y luego validar los campos. Si la validación de texto falla, el archivo se queda huérfano, consumiendo espacio inútilmente.
    >
    > En GlyphLog, el router valida **primero** el schema Pydantic del texto dentro de un bloque `try...except`. Solo si los datos son 100% válidos se activa la persistencia de la imagen en disco. Además, validamos el archivo leyendo sus **magic bytes (encabezado binario)** directamente en memoria antes de escribirlo, evitando que se cuelen scripts maliciosos con extensiones falsas (spoofing)."*

---

## 🛠️ 3. Infraestructura y Calidad de Código (DevOps & QA)

### Tema A: Por qué Dockerizar todo el Monorepo en desarrollo local

*   **La Pregunta del Entrevistador:** *Si los desarrolladores pueden correr `pnpm dev` y activar la API localmente, ¿por qué vale la pena configurar un Docker Compose para todo?*
*   **La Respuesta Estrella (Senior):**
    > *"Docker Compose nos da **hermeticidad y repetibilidad**. Asegura que cada desarrollador de mi equipo, sin importar si usa Linux, macOS o Windows, corra la aplicación sobre exactamente las mismas versiones de sistema operativo, dependencias de sistema y bases de datos.
    > En GlyphLog, Docker Compose levanta PostgreSQL 15, SonarQube para calidad de código, la API (con autoreload mapeado a través de volúmenes) y el Web SPA en una red virtual aislada. Esto reduce los costes de onboarding de nuevos desarrolladores a un simple `docker compose up -d`."*

### Tema B: Cuál es el rol de SonarQube en tus proyectos

*   **La Pregunta del Entrevistador:** *Veo que tienes SonarQube configurado en el proyecto. ¿Cómo lo utilizas y qué problemas te ayuda a prevenir?*
*   **La Respuesta Estrella (Senior):**
    > *"SonarQube es nuestro guardián de calidad de código estático (QA). Lo utilizamos localmente e integrado en los pipelines de CI/CD para imponer un **Quality Gate**.
    > Nos ayuda a detectar tres categorías de problemas antes de que lleguen a producción:
    > 1.  **Code Smells:** Código duplicado, funciones demasiado complejas (alta complejidad ciclomática) o variables no utilizadas.
    > 2.  **Bugs potenciales:** Desajustes en promesas no controladas en el frontend o imports circulares en el backend.
    > 3.  **Vulnerabilidades (Vulnerabilities/Security Hotspots):** Uso de algoritmos de hash débiles, secretos expuestos en código duro o malas prácticas de inyección SQL. Esto asegura que la calidad técnica sea un estándar de ingeniería no negociable."*
