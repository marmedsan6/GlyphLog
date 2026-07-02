// Centraliza el acceso a variables de entorno con validación temprana.
//
// REGLA DE SEGURIDAD:
// Solo añadir variables con prefijo VITE_ en este archivo.
// Las variables VITE_ son públicas — visibles en el bundle de producción.
// Secretos, API keys privadas y credenciales van EXCLUSIVAMENTE en el backend.

function requireEnvVar(key: string): string {
  const value = import.meta.env[key] as string | undefined
  if (!value) {
    throw new Error(
      `[GlyphLog] Variable de entorno "${key}" no está definida.\n` +
        `Copia .env.example a .env.local y configura el valor correcto.`
    )
  }
  return value
}

// Las variables opcionales devuelven string vacío cuando faltan — el llamador
// decide cómo degradar (ej: ocultar el botón de Google si no hay client_id).
function optionalEnvVar(key: string): string {
  return (import.meta.env[key] as string | undefined) ?? ''
}

export const env = {
  apiUrl: requireEnvVar('VITE_API_URL'),
  // En producción con mismo origen, VITE_API_BASE_URL puede estar vacío.
  // requireEnvVar rechaza strings vacíos (son falsy), así que usamos
  // una lectura directa con fallback a string vacío.
  apiBaseUrl: (import.meta.env['VITE_API_BASE_URL'] as string) ?? '',
  // VITE_GOOGLE_CLIENT_ID es OPCIONAL: si está vacío, el botón de Google
  // no se renderiza y el endpoint backend responde 503 (modo degradado).
  // Sigue el mismo Client ID que GOOGLE_CLIENT_ID en el backend.
  googleClientId: optionalEnvVar('VITE_GOOGLE_CLIENT_ID'),
} as const
