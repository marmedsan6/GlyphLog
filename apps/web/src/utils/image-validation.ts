const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export function validateImageFile(file: File | null): string | null {
  if (!file) return null
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'La imagen debe ser JPG, PNG o WebP'
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'La imagen no puede superar los 5MB'
  }
  return null
}
