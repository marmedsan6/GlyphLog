const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_SIZE = 2 * 1024 * 1024

export function validateAvatarFile(file: File | null): string | null {
  if (!file) return null
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return 'El avatar debe ser JPG, PNG o WebP'
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return 'El avatar no puede superar los 2MB'
  }
  return null
}
