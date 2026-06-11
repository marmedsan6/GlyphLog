import { Link } from 'react-router-dom'

// Página de login.
// TODO (T-009): implementar formulario con validación y llamada a POST /auth/login
export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">Accede a tu colección</p>
        </div>

        {/* TODO: formulario de login */}
        <div className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
          Formulario de login — pendiente de implementar (T-009)
        </div>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-foreground underline hover:no-underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
