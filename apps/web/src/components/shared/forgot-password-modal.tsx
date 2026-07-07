import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    // Simular latencia de red para dar feedback de carga premium
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsSubmitting(false)
    setSent(true)
  }

  function handleClose() {
    setEmail('')
    setSent(false)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Recuperar contraseña</h2>
          <p className="text-sm text-muted-foreground">
            Introduce tu correo electrónico para enviarte un enlace de restablecimiento.
          </p>
        </div>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
              <p className="font-medium">¡Enlace simulado enviado!</p>
              <p className="mt-1 text-xs">
                En un entorno de producción, recibirías un email en <strong>{email}</strong>.
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Al tratarse de un MVP formativo, el backend de envío no está configurado. Si necesitas acceso manual, contacta al administrador en <span className="underline">soporte@glyphlog.com</span>.
            </p>
            <Button
              onClick={handleClose}
              className="w-full"
            >
              Entendido
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
