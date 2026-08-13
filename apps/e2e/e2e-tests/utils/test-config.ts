/**
 * Configuración de entorno para los tests E2E.
 *
 * IMPORTANTE: `page.request` usa la URL base de Playwright (baseURL, que apunta
 * al frontend en http://localhost:5173). Las llamadas directas a la API con
 * `page.request` deben usar la URL ABSOLUTA del backend, no el proxy de Vite,
 * porque el proxy Vite vive dentro del contenedor `web` (Docker) y no puede
 * resolver `localhost:8000` (la API está en el contenedor `api`).
 *
 * El frontend en el navegador SÍ usa la URL absoluta (VITE_API_URL), por eso la
 * UI funciona pero `page.request` con rutas relativas falla con 500.
 */
export const API_BASE_URL =
  process.env.E2E_API_BASE_URL || 'http://localhost:8000/api/v1';
