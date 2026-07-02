import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isAxiosError } from 'axios'
import { useAuth } from '@/hooks/use-auth'
import { loginUser, loginWithGoogle } from '@/services/auth.service'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { GoogleLoginButton } from '@/components/shared/google-login-button'
import { env } from '@/lib/env'
import { useEffect } from 'react'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Estados para recuperación de contraseña
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
  const [isSubmittingForgotPassword, setIsSubmittingForgotPassword] = useState(false)

  const sessionExpired = searchParams.get('sessionExpired') === '1'
  const showGoogleButton = Boolean(env.googleClientId)

  async function handleForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotPasswordEmail) return

    setIsSubmittingForgotPassword(true)
    // Simular latencia de red para dar feedback de carga premium
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsSubmittingForgotPassword(false)
    setForgotPasswordSent(true)
  }

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const idToken = params.get('id_token')
      if (idToken) {
        // Limpiar el hash de la URL para seguridad
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        
        handleGoogleCallback(idToken)
      }
    }
  }, [])

  async function handleGoogleCallback(idToken: string) {
    setIsLoading(true)
    setError(null)
    try {
      const response = await loginWithGoogle(idToken)
      login(response.access_token)
      navigate('/collection')
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Error al iniciar sesión con Google. Inténtalo de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Email y contraseña son obligatorios')
      return
    }

    setIsLoading(true)
    try {
      const response = await loginUser({ email, password })
      login(response.access_token)
      navigate('/collection')
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Error inesperado. Inténtalo de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <p className="text-sm text-muted-foreground">Accede a tu colección</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {sessionExpired && (
              <div className="rounded-md bg-amber-100 p-3 text-sm text-amber-800">
                Tu sesión expiró. Vuelve a iniciar sesión para continuar.
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground underline hover:no-underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
          {showGoogleButton && (
            <>
              <div
                className="my-4 flex items-center gap-3"
                role="separator"
                aria-label="o continúa con"
              >
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase text-muted-foreground">o</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <GoogleLoginButton disabled={isLoading} />
            </>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-foreground underline hover:no-underline">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Modal de simulación de restablecimiento de contraseña */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg space-y-4">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-semibold tracking-tight">Recuperar contraseña</h2>
              <p className="text-sm text-muted-foreground">
                Introduce tu correo electrónico para enviarte un enlace de restablecimiento.
              </p>
            </div>
            {!forgotPasswordSent ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsForgotPasswordOpen(false)
                      setForgotPasswordEmail('')
                    }}
                    disabled={isSubmittingForgotPassword}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmittingForgotPassword}>
                    {isSubmittingForgotPassword ? 'Enviando...' : 'Enviar enlace'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                  <p className="font-medium">¡Enlace simulado enviado!</p>
                  <p className="mt-1 text-xs">
                    En un entorno de producción, recibirías un email en <strong>{forgotPasswordEmail}</strong>.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Al tratarse de un MVP formativo, el backend de envío no está configurado. Si necesitas acceso manual, contacta al administrador en <span className="underline">soporte@glyphlog.com</span>.
                </p>
                <Button
                  onClick={() => {
                    setIsForgotPasswordOpen(false)
                    setForgotPasswordSent(false)
                    setForgotPasswordEmail('')
                  }}
                  className="w-full"
                >
                  Entendido
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
