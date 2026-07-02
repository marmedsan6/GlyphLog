import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { loginWithGoogle } from '@/services/auth.service'

// Tipos mínimos del SDK de Google Identity Services (`gsi/client`).
// No declaramos `window.google` globalmente para evitar colisiones con
// @react-oauth/google. Usamos un getter type-safe.
interface GoogleIdCredential {
  credential?: string
  select_by?: string
  clientId?: string
}
type GoogleIdPromptCallback = (response: GoogleIdCredential) => void
interface GoogleIdConfig {
  client_id: string
  callback: GoogleIdPromptCallback
  cancel_on_tap_outside?: boolean
  auto_select?: boolean
  itp_support?: boolean
  // FedCM (Federated Credential Management). El SDK de Google lo soporta
  // aunque los tipos públicos aún no lo reflejen en algunas versiones.
  use_fedcm_for_button?: boolean
}
interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void
  prompt: (callback?: (notification: unknown) => void) => void
  cancel: () => void
}
interface GoogleAccounts {
  id: GoogleAccountsId
}
function getGis(): GoogleAccounts | null {
  if (typeof window === 'undefined') return null
  const g = (window as unknown as { google?: { accounts?: GoogleAccounts } }).google
  return g?.accounts ?? null
}

export interface GoogleLoginButtonProps {
  /** Deshabilita el botón sin deshabilitar visualmente el resto del formulario. */
  disabled?: boolean
  /** Clases adicionales de Tailwind para personalizar el botón. */
  className?: string
}

/**
 * Botón "Continuar con Google" reutilizable.
 *
 * Decisión de implementación:
 * `useGoogleLogin` de @react-oauth/google usa el flujo OAuth 2.0 Token Client
 * (`initTokenClient`) y devuelve un `access_token`, NO un `id_token` JWT.
 * Nuestro backend espera y verifica un `id_token` con
 * `google.oauth2.id_token.verify_oauth2_token`, por lo que necesitamos el
 * flujo de Google Identity Services (`google.accounts.id`).
 *
 * Por eso este componente carga el script GSI por su cuenta y usa
 * `google.accounts.id` directamente. No depende de `GoogleOAuthProvider`:
 * basta con tener `VITE_GOOGLE_CLIENT_ID` configurado.
 *
 * Resultado: el componente es testeable de forma aislada (sin wrapper) y
 * se puede usar en cualquier parte de la app.
 */
export function GoogleLoginButton({
  disabled = false,
  className = '',
}: GoogleLoginButtonProps) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  // Evita inicializar `google.accounts.id` más de una vez (StrictMode en dev
  // monta/desmonta componentes, lo que provocaría doble init).
  const initialized = useRef(false)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) return

    // Inicializa el client de Google cuando el script GSI esté disponible.
    // El script puede estar ya cargado (otro componente lo inyectó antes)
    // o estar pendiente de carga. Gestionamos ambos casos.
    function tryInit(): boolean {
      const gis = getGis()
      if (gis && !initialized.current) {
        initialized.current = true
        gis.id.initialize({
          client_id: clientId as string,
          callback: handleCredentialResponse,
          cancel_on_tap_outside: false,
          itp_support: true,
          // FedCM (Federated Credential Management) es el nuevo estándar de
          // Chrome para login federado sin third-party cookies. GIS lo usa
          // por defecto en Chrome moderno. use_fedcm_for_button habilita el
          // flujo FedCM cuando el usuario hace click en un botón custom.
          use_fedcm_for_button: true,
        })
        return true
      }
      return false
    }

    if (!tryInit()) {
      // El script no está cargado todavía. Lo inyectamos una sola vez y nos
      // suscribimos a su evento `load`. Esta forma es más limpia que un
      // setInterval con polling: no necesitamos polling porque sabemos
      // exactamente cuándo el script termina de cargar.
      const SCRIPT_ID = 'google-gsi-client'
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = SCRIPT_ID
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', tryInit, { once: true })

      return () => {
        script?.removeEventListener('load', tryInit)
      }
    }

    return () => {
      // Cierra el popup pendiente si el componente se desmonta mientras
      // el usuario está viendo el modal de Google. Sin esto, el popup
      // queda huérfano y el usuario puede autenticarse en un componente
      // que ya no existe (zombie auth). Ver issue #17.
      getGis()?.id.cancel()
    }
    // handleCredentialResponse se redefine en cada render pero su
    // comportamiento es estable; no la añadimos a deps para no reinicializar
    // el SDK en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCredentialResponse(response: GoogleIdCredential) {
    const idToken = response.credential
    if (!idToken) {
      toast({
        title: 'Error con Google',
        description: 'No se recibió un token válido. Inténtalo de nuevo.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await loginWithGoogle(idToken)
      login(result.access_token)
      navigate('/collection')
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        toast({
          title: 'Error con Google',
          description: err.response.data.detail,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error con Google',
          description: 'Error inesperado. Inténtalo de nuevo.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleClick() {
    const gis = getGis()
    if (!gis) {
      toast({
        title: 'Google no está disponible',
        description: 'El script de Google no ha cargado. Recarga la página.',
        variant: 'destructive',
      })
      return
    }
    // prompt() inicia el flujo de Google Sign-In. Con FedCM (activo por
    // defecto en Chrome moderno) el navegador gestiona el popup y la
    // selección de cuenta. El callback de initialize() recibe el id_token
    // cuando el flujo tiene éxito.
    //
    // NOTA: no pasamos callback a prompt(). Los métodos de status moments
    // (isDismissedMoment, isNotDisplayed, etc.) están deprecated con FedCM
    // y pueden interferir con el flujo normal, especialmente cuando el
    // usuario no tiene sesión activa en Google. Si el usuario cancela,
    // simplemente no se invoca el callback de initialize().
    // Ver: https://developers.google.com/identity/gsi/web/guides/fedcm-migration
    gis.id.prompt()
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full ${className}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label="Continuar con Google"
    >
      {/* Ícono oficial de Google (SVG inline para evitar dependencias de imágenes). */}
      <svg
        className="mr-2 h-4 w-4"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isLoading ? 'Conectando con Google...' : 'Continuar con Google'}
    </Button>
  )
}
