# Ficha Chrome Web Store — GlyphLog Companion

> **Estado:** preparada, no publicada (issue #67)
> **Visibilidad prevista:** unlisted
> **Extension ID:** `boehfebkjeecahbomjhbnokjkjnippje`

Esta ficha se usa cuando se suba el paquete. #67 no publica ni paga la cuenta
de desarrollador.

## Identidad

- **Nombre:** GlyphLog Companion
- **Versión actual:** 0.2.0
- **Descripción corta (≤132):** Actualiza tu progreso de anime y manga en GlyphLog desde Crunchyroll, AnimeFLV y MangaDex.
- **Single purpose:** sincronizar progreso de media ya detectada con la cuenta GlyphLog del usuario.

## Descripción larga

GlyphLog Companion conecta Crunchyroll, AnimeFLV y MangaDex con tu colección de GlyphLog.

1. Instálala en Chrome o Brave.
2. En GlyphLog → Perfil → Dispositivos genera un código de 6 caracteres.
3. Pégalo en el popup. Nunca copies el token de sesión.

La extensión guarda un token de dispositivo revocable, habla con la API de GlyphLog y lee solo los sitios de los adaptadores. Firefox y Safari no están soportados.

Privacidad: https://glyphlog.qzz.io/privacy

## Permisos (justificación)

| Permiso / host | Por qué |
| -------------- | ------- |
| `storage` | Guardar el token de dispositivo y la URL de API. |
| `https://glyphlog.qzz.io/*` | API y origen de la SPA en producción. |
| `https://www.crunchyroll.com/*` | Detectar el título/capítulo en Crunchyroll. |
| `https://animeflv.net/*`, `https://*.animeflv.net/*` | Detectar en AnimeFLV (subdominios rotativos). |
| `https://mangadex.org/*` | Detectar en MangaDex. |

No se usa `<all_urls>`. El paquete de producción **no** declara `http://localhost:8000/*`.

## Assets

- Iconos: `apps/extension/icons/` (16, 48, 128).
- Captura 1280×800: pendiente al publicar (popup emparejado + guía en Perfil).
- Política de privacidad: `https://glyphlog.qzz.io/privacy`

## Clave privada

- Pública (en el manifiesto): ver `apps/extension/wxt.config.ts` (`manifest.key`).
- Privada: `apps/extension/companion-private.pem` (gitignored). Copiar a un
  almacén fuera del repo antes de la primera publicación. Si se pierde, Chrome
  Web Store asignará otro ID y la detección SPA dejará de coincidir.

## Pasos de publicación (manual, fuera de #67)

1. Crear cuenta [Chrome Web Store Developer](https://chrome.google.com/webstore/devconsole) (pago único).
2. `pnpm --filter glyphlog-companion-extension build` en modo production.
3. Empaquetar `.output/chrome-mv3` (sin sourcemaps).
4. Subir zip, marcar **Unlisted**, pegar esta ficha y la URL de privacidad.
5. Poner la URL resultante en `VITE_COMPANION_STORE_URL` y redesplegar la web.

## Checklist pre-subida

- [ ] Nombre visible `GlyphLog Companion`
- [ ] Sin host localhost
- [ ] `/privacy` accesible sin login
- [ ] ID = `boehfebkjeecahbomjhbnokjkjnippje`
- [ ] Capturas e icono 128
- [ ] Unlisted, no listada en búsquedas
