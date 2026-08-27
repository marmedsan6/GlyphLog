# GlyphLog Companion

Extensión Chromium para registrar y actualizar el progreso de tus animes y
mangas sin abrir la aplicación web. Chrome y Brave son el soporte actual; Edge
Chromium funciona. Firefox y Safari no están soportados.

La guía de usuario vive en GlyphLog → **Perfil → Dispositivos**. Esta página es
la referencia de instalación para el zip de fallback.

## Instalar (usuario)

Hasta que Companion esté en Chrome Web Store unlisted, usa el zip:

1. En GlyphLog, ve a **Perfil → Dispositivos** y pulsa **Descargar extensión**.
2. Descomprime el zip en una carpeta.
3. Abre `chrome://extensions` o `brave://extensions`.
4. Activa **Modo de desarrollador**.
5. Pulsa **Cargar descomprimida** y elige esa carpeta.
6. Vuelve a GlyphLog y pulsa **Emparejar nuevo dispositivo**.
7. Introduce el código de 6 caracteres en el popup. Nunca copies el token de sesión.

Cuando exista URL de Store, el botón **Añadir a Chrome** sustituye estos pasos.
El zip sigue como fallback.

## Emparejar

1. GlyphLog → **Perfil** (`/profile`) → **Dispositivos**.
2. **Emparejar nuevo dispositivo**.
3. Copia el código de 6 caracteres (caduca en 5 minutos).
4. Ábrelo en el popup de Companion.

El token de dispositivo es independiente del JWT, se puede revocar y caduca a
los 90 días de inactividad.

## Desarrollo (load unpacked desde el repo)

1. `pnpm --filter glyphlog-companion-extension build`
2. Carga `apps/extension/.output/chrome-mv3` en Chrome o Brave.
3. El ID estable con `manifest.key` es `boehfebkjeecahbomjhbnokjkjnippje`.

El build de desarrollo incluye `http://localhost:8000/*`. El de producción usa
`https://glyphlog.qzz.io` y no declara localhost.

## Seguridad

- No solicita `<all_urls>`. Solo hosts de adaptadores y la API de GlyphLog.
- Tokens de dispositivo revocables desde el perfil.
- La clave privada RSA (`companion-private.pem`) no se versiona. Guardarla
  fuera del repo antes de publicar en Chrome Web Store.

## Privacidad

https://glyphlog.qzz.io/privacy
