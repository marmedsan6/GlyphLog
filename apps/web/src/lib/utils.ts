import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utilidad para combinar clases de Tailwind de forma segura.
// Generada por shadcn/ui — no modificar.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
