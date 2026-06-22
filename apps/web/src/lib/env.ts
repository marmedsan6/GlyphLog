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

export const env = {
  apiUrl: requireEnvVar('VITE_API_URL'),
  apiBaseUrl: requireEnvVar('VITE_API_BASE_URL'),
} as const
