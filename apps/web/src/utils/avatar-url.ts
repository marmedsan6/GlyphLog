import { env } from '@/lib/env'

/**
 * Construye la URL pública de un avatar.
 *
 * El backend devuelve `avatar_url` como:
 * - Ruta relativa `/uploads/avatars/{filename}` para avatares subidos.
 * - URL absoluta de DiceBear para avatares generados.
 */
export function getAvatarUrl(avatarUrl: string | null): string {
  if (!avatarUrl) {
    return ''
  }

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl
  }

  const normalizedPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
  return `${env.apiBaseUrl}${normalizedPath}`
}
