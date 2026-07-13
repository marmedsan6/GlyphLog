# [FIX] Cache leak de TanStack Query entre cuentas tras logout

> **Estado:** backlog
> **Prioridad:** alta
> **Severidad:** P0 — blocker (fuga de datos entre usuarios)
> **Dependencias:** ninguna

## Contexto

La aplicación usa TanStack Query v5 con un `QueryClient` singleton a nivel de módulo (`apps/web/src/lib/query-client.ts`). Este singleton persiste en memoria durante toda la vida de la SPA. El `staleTime` de las queries de entradas es de 60 segundos.

El `logout()` del Zustand store (`auth.store.ts`) limpia el token de `sessionStorage` y setea `isAuthenticated: false`, pero **no limpia la caché de TanStack Query**. Esto provoca que cuando un usuario cierra sesión y otro inicia sesión en la misma pestaña (sin recargar la página), el nuevo usuario ve las entradas del anterior durante hasta 60 segundos.

## Objetivo

Garantizar que al cerrar sesión se destruya toda la caché de TanStack Query para que el siguiente usuario no vea datos ajenos.

## Bug reportado

**Descripción:** Al cambiar de cuenta sin recargar la página, el nuevo usuario ve las entradas de la cuenta anterior hasta que recarga.

**Pasos para reproducir:**
1. Iniciar sesión con la Cuenta A
2. Navegar a `/collection` — se cargan y cachean las entradas de A
3. Cerrar sesión (click en "Cerrar sesión")
4. Iniciar sesión con la Cuenta B (sin recargar la página)
5. Navegar a `/collection`
6. Observar: se muestran las entradas de la Cuenta A

**Resultado esperado:** La Cuenta B ve solo sus propias entradas (o una lista vacía si no tiene).
**Resultado actual:** La Cuenta B ve las entradas de la Cuenta A hasta que recarga la página.

**Evidencia:**
- `auth.store.ts` línea 32-35: `logout()` solo llama a `clearAccessToken()` y `set({ isAuthenticated: false })`
- `app-layout.tsx` línea 12-15: `handleLogout()` solo llama a `logout()` y `navigate()`
- `query-client.ts`: singleton con `staleTime: 5 min` por defecto
- `useEntries.ts`: `staleTime: 60_000` — dentro de esa ventana, TanStack sirve de caché
- Búsqueda global: **0 llamadas** a `queryClient.clear()`, `queryClient.resetQueries()` o `queryClient.removeQueries()` en todo el codebase

## Análisis de causa raíz

**Archivo(s) afectado(s):**
- `apps/web/src/stores/auth.store.ts` — `logout()` no limpia QueryClient
- `apps/web/src/components/shared/app-layout.tsx` — `handleLogout()` no limpia QueryClient

**Causa identificada:** El `QueryClient` singleton mantiene en memoria las respuestas cacheadas de las queries del usuario A. Cuando el usuario B monta `useEntries` con la misma query key (`['entries', {...}]`), TanStack Query encuentra datos frescos en caché (dentro del staleTime de 60s) y los sirve sin hacer petición de red.

**Impacto:**
- Fuga de datos entre cuentas en la misma pestaña del navegador
- Afecta a todas las queries cacheadas: `entries`, `entry/{id}`, `search-entries`
- El interceptor 401 de `api-client.ts` NO tiene este bug porque usa `window.location.href` (recarga completa que destruye el singleton)

## Tareas técnicas

- [ ] Importar `queryClient` en `auth.store.ts` y añadir `queryClient.clear()` dentro de la acción `logout()`
- [ ] Añadir `queryClient.clear()` como defensa en profundidad en el interceptor 401 de `api-client.ts` (antes del redirect)
- [ ] Actualizar el test de `auth.store.test.ts` para verificar que `queryClient.clear()` se llama en `logout()`
- [ ] Verificar manualmente el flujo completo: login A → ver entradas → logout → login B → ver solo entradas de B

## Criterios de aceptación

- ✅ Tras cerrar sesión con la Cuenta A e iniciar sesión con la Cuenta B (sin recargar), la Cuenta B NO ve entradas de la Cuenta A
- ✅ `queryClient.clear()` se ejecuta como parte del flujo de logout
- ✅ El interceptor 401 también limpia la caché como defensa en profundidad
- ✅ Los tests existentes siguen pasando (200 tests)
- ✅ Se añade test que verifica la llamada a `queryClient.clear()` en logout
- ✅ El código sigue las convenciones de AGENTS.md

## Notas técnicas

### Alternativas evaluadas

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| `queryClient.clear()` en el store | Logout atómico, un solo punto de cambio | Acopla el store a TanStack Query | ✅ Elegida — el store ya importa `auth-token.ts`, una infraestructura más no es problema |
| `queryClient.clear()` en `app-layout.tsx` | Store libre de deps de infraestructura | Si hay otro punto de logout, hay que duplicar | ❌ Rechazada — frágil |
| `queryClient.removeQueries()` | Más selectivo | No aporta beneficio sobre `clear()` para este caso | ❌ Rechazada — `clear()` es más robusto (también cancela queries in-flight) |

### Por qué `clear()` y no `resetQueries()`
- `clear()` elimina toda la caché, cancela queries in-flight y resetea el estado a prístino
- `resetQueries()` solo resetea al estado inicial pero mantiene la caché
- Para un logout, queremos el estado más limpio posible

## Archivos relevantes

- `apps/web/src/stores/auth.store.ts` — añadir `queryClient.clear()` en `logout()`
- `apps/web/src/lib/query-client.ts` — singleton del QueryClient (referencia, no se modifica)
- `apps/web/src/lib/api-client.ts` — interceptor 401 (añadir `queryClient.clear()`)
- `apps/web/src/components/shared/app-layout.tsx` — handler de logout (referencia, no se modifica)
- `apps/web/src/stores/auth.store.test.ts` — actualizar tests

## Validación INVEST

- [x] **Independent:** No depende de otros issues. Fix autocontenido.
- [x] **Negotiable:** El punto exacto donde inyectar `clear()` es negociable (store vs UI handler).
- [x] **Valuable:** Resuelve una fuga de datos entre cuentas. Seguridad básica.
- [x] **Estimable:** 20-30 minutos (cambio + test).
- [x] **Small:** 2 archivos modificados, 1 test actualizado.
- [x] **Testable:** Login A → logout → login B → verificar que no se ven datos de A. Binario.
