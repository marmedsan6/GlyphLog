import { Link } from 'react-router-dom'

// Página de registro.
// TODO (T-008): implementar formulario con validación y llamada a POST /auth/register
export function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Empieza a gestionar tu colección
          </p>
        </div>

        {/* TODO: formulario de registro */}
        <div className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
          Formulario de registro — pendiente de implementar (T-008)
        </div>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-foreground underline hover:no-underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
