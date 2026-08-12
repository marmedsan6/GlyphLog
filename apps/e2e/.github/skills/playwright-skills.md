# Skills de Playwright — Guía de Uso

> Referencia para el equipo QA — qué hacen las 3 skills de Playwright instaladas, cómo instalarlas y cómo usarlas.

---

## ¿Qué es una AI Skill?

Una **skill** amplía el conocimiento del agente IA para una tarea específica. Son archivos Markdown locales — no scripts, no ejecutables, no envían datos a ningún servidor. El agente los lee automáticamente cuando detecta que la tarea los necesita.

```
Tu pregunta → Agente detecta la actividad → Lee la skill relevante → Responde con el patrón correcto
```

---

## Skills Instalables

| Skill | Origen | Propósito |
|---|---|---|
| `playwright-best-practices` | `currents-dev` (GitHub) | Guía completa de buenas prácticas (57 docs) |
| `playwright-cli` | `microsoft` (GitHub) | Automatización de browser desde la línea de comandos |
| `playwright-generate-test` | `github/awesome-copilot` | Generación automática de tests con Playwright MCP |

### Cómo instalar (o reinstalar)

```bash
# playwright-best-practices
npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices

# playwright-cli
npx skills add microsoft/playwright-cli@playwright-cli

# playwright-generate-test
npx skills add github/awesome-copilot@playwright-generate-test
```

> Durante la instalación, el CLI pregunta qué agentes incluir — presiona **Enter** para aceptar los universales (incluye GitHub Copilot). Luego confirma con **Yes**.

---

## 1. playwright-best-practices

**Origen:** `currents-dev/playwright-best-practices-skill` — MIT License  
**Qué hace:** Inyecta 57 documentos de referencia organizados en 8 categorías. El agente lee solo el documento relevante para lo que estás haciendo — no carga todo a la vez.

### Categorías y cuándo se activan

| Categoría | Documentos | Se activa cuando... |
|---|---|---|
| `core` | 11 | Escribes tests E2E, usas locators, assertions, POM, fixtures, configuración |
| `debugging` | 4 | Un test falla, es flaky, hay timeouts o errores de consola |
| `testing-patterns` | 15 | Testeas accesibilidad, API, formularios, drag & drop, seguridad, performance, i18n |
| `advanced` | 8 | Necesitas auth/OAuth, mobile, multi-tab, mocking de fecha/hora, multi-usuario |
| `browser-apis` | 4 | Trabajas con iframes, WebSockets, service workers, geolocalización |
| `architecture` | 3 | Decides entre POM vs fixtures o cuándo mockear servicios |
| `frameworks` | 4 | Tu app usa React, Angular, Vue o Next.js |
| `infrastructure-ci-cd` | 9 | Configuras GitHub Actions, Docker, sharding, reportes o cobertura |

### Usos — prompts de ejemplo

```
# Crear un Page Object nuevo (hereda de BasePage.ts)
"Crea LoginPage.ts heredando de BasePage siguiendo el patrón"

# Escribir un test con patrón AAA
"Escribe un test para validar el formulario de registro, usa patrón Arrange-Act-Assert
 y la convención 'should [behavior] when [condition]'"

# Diagnosticar un test flaky
"Este test falla 1 de cada 5 ejecuciones en CI, ayúdame a diagnosticarlo"

# Eliminar waits hardcodeados
"Reemplaza todos los page.waitForTimeout() de estos tests por auto-waiting correcto"

# Configurar GitHub Actions
"Crea un workflow de GitHub Actions para correr los tests en cada PR con sharding en 4 workers"

# Mockear respuestas de API
"Mockea el endpoint GET /api/users para que devuelva datos de prueba sin depender del backend"

# Test de accesibilidad
"Agrega un test de accesibilidad con axe-core a la página de inicio"
```

---

## 2. playwright-cli

**Origen:** `microsoft/playwright-cli` — desarrollado por Microsoft  
**Qué hace:** Le da al agente una herramienta de línea de comandos para controlar un browser real en tiempo real. Útil para explorar una página antes de escribir el test, tomar screenshots, rellenar formularios, grabar trazas, y extraer información del DOM.

> ⚠️ **Nota de seguridad:** Esta skill tiene calificación **High Risk en Snyk** y **Med Risk en Gen**. El riesgo proviene de que los comandos pueden controlar el browser directamente. Úsala solo en entornos de desarrollo, nunca en CI sin revisión.

### Comandos principales

```bash
# Abrir browser y navegar
playwright-cli open https://tuapp.com
playwright-cli goto https://tuapp.com/login

# Interactuar con elementos (los refs como e1, e3 vienen del snapshot)
playwright-cli snapshot                  # Ver estado actual del DOM
playwright-cli click e5
playwright-cli fill e3 "usuario@email.com"
playwright-cli press Enter

# Capturar estado
playwright-cli screenshot
playwright-cli screenshot --filename=login-page.png
playwright-cli tracing-start
playwright-cli tracing-stop

# Guardar sesión autenticada
playwright-cli state-save auth.json
playwright-cli state-load auth.json

# Mockear red
playwright-cli route "https://api.example.com/**" --body="{""mock"": true}"

# Cerrar
playwright-cli close
```

### Usos — prompts de ejemplo

```
# Explorar una página para identificar selectores
"Abre https://tuapp.com/login y dame un snapshot del DOM para identificar los selectores"

# Rellenar y enviar un formulario
"Abre el formulario de contacto en /contact, rellena todos los campos con datos de prueba
 y envíalo. Dame el snapshot del resultado"

# Grabar una traza para debuggear
"Abre la página de checkout, activa tracing, completa el flujo de compra y detén la traza"

# Guardar estado de autenticación
"Haz login en https://tuapp.com, guarda el estado de sesión en auth.json para reutilizarlo en tests"
```

---

## 3. playwright-generate-test

**Origen:** `github/awesome-copilot` (repositorio oficial de skills de GitHub Copilot)  
**Qué hace:** Genera tests de Playwright TypeScript completos a partir de un escenario descrito en lenguaje natural. Usa Playwright MCP para navegar la app paso a paso, observar el DOM real, y finalmente emitir un test que funciona. Itera hasta que el test pasa.

### Flujo de trabajo

1. Tú describes el escenario a testear
2. El agente navega la app con `playwright-cli` paso a paso
3. Observa el DOM real en cada paso
4. Genera el test TypeScript basado en lo observado
5. Ejecuta el test y repite hasta que pasa
6. Guarda el archivo en la carpeta `tests/`

### Usos — prompts de ejemplo

```
# Generar un test desde un escenario
"Genera un test de Playwright para este escenario:
 Un usuario va a /login, ingresa email y contraseña válidos, hace clic en Login
 y debe ver el dashboard con su nombre en el header"

# Generar test de formulario
"Genera un test para el flujo de registro: el usuario rellena nombre, email y contraseña,
 acepta los términos, envía el formulario y debe ver un mensaje de confirmación"

# Generar test de navegación
"Genera un test que verifique que el menú de navegación tiene los links correctos
 y que cada uno lleva a la URL esperada"
```

> Esta skill requiere que **Playwright MCP** esté configurado en tu entorno para que el agente pueda navegar la app en tiempo real. Sin MCP configurado, el agente pedirá el escenario y generará el test basado solo en tu descripción.

---

## Cuándo usar cada skill

| Quiero... | Usar |
|---|---|
| Escribir, mejorar o debuggear tests con buenas prácticas | `playwright-best-practices` |
| Explorar la app en vivo, tomar screenshots o guardar sesiones | `playwright-cli` |
| Generar un test completo desde una descripción de escenario | `playwright-generate-test` |
| Flujo completo (explorar → generar → validar calidad) | Las 3 se complementan entre sí |

---

*Mantenido por el equipo de GlyphLog.*
