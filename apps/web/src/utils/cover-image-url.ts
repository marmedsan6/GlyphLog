import { env } from '@/lib/env'

/**
 * Construye la URL pública de una imagen de portada.
 *
 * El backend almacena `cover_image` como una ruta absoluta desde la raíz
 * del dominio (ej. `/uploads/covers/{filename}`) y sirve los archivos
 * estáticamente bajo `/uploads`. Por eso necesitamos la URL base del
 * backend, no la ruta `/api/v1` usada para las llamadas REST.
 */
export function getCoverImageUrl(coverImage: string | null): string | null {
  if (!coverImage) return null

  // Evita dobles barras si la ruta almacenada ya incluye el origen.
  if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
    return coverImage
  }

  const normalizedPath = coverImage.startsWith('/') ? coverImage : `/${coverImage}`
  return `${env.apiBaseUrl}${normalizedPath}`
}
