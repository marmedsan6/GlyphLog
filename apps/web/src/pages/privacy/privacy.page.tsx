import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <article className="mx-auto max-w-2xl space-y-6 px-4 py-16 text-sm leading-6 text-muted-foreground">
        <p className="text-xs uppercase tracking-wide">GlyphLog</p>
        <h1 className="text-3xl font-bold text-foreground">Privacidad de GlyphLog Companion</h1>
        <p>
          Esta página explica qué datos trata la extensión GlyphLog Companion. No se usa el token de sesión (JWT) de la aplicación web.
        </p>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Qué datos se tratan</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Un código de emparejamiento de 6 caracteres, válido 5 minutos, generado en tu perfil.</li>
            <li>Un token de dispositivo independiente, guardado en chrome.storage.local y en GlyphLog como hash.</li>
            <li>El progreso que tú envías (entrada, valor y nota opcional) a la API de GlyphLog.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Dónde se guarda</h2>
          <p>
            El token de dispositivo vive en el almacenamiento local de la extensión. GlyphLog guarda el hash, el nombre del dispositivo y las fechas de uso. Caduca a los 90 días de inactividad. Puedes revocarlo en Perfil → Dispositivos.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Sitios a los que accede</h2>
          <p>
            Companion habla con la API de GlyphLog y lee Crunchyroll, AnimeFLV y MangaDex solo para detectar el título o capítulo que estás viendo. No solicita acceso a todas las páginas.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Contacto</h2>
          <p>
            GlyphLog es un proyecto personal. Para preguntas sobre estos datos, usa el repositorio o el correo asociado a tu cuenta.
          </p>
        </section>
        <p>
          <Link to="/" className="text-foreground underline hover:no-underline">
            Volver al inicio
          </Link>
        </p>
      </article>
    </div>
  )
}
