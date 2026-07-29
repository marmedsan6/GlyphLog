# GlyphLog Companion Extension — Testing Guide

## Problema Resuelto

**Síntoma:** La extensión no detectaba capítulos en Crunchyroll/MangaDex.  
**Causa raíz:** El `device_token` no se guardaba en `chrome.storage.local` después del emparejamiento.  
**Solución:** Script automático + modo debug que inyecta el token directamente.

---

## Inicio Rápido (SIN línea de comandos)

### Opción 1: Usar el Script (Recomendado)

```bash
# En la raíz del proyecto
./start-brave-extension.sh
```

Este script:
- Mata Brave si ya está corriendo
- Inicia Brave con la extensión pre-cargada (flag `--load-extension`)
- Muestra instrucciones

Después de cada `pnpm --filter glyphlog-companion-extension build`, recarga la extensión desde `brave://extensions/` usando **Reload** antes de probarla. El navegador mantiene el service worker anterior aunque el directorio de salida haya cambiado.

### Opción 2: Comando Manual

Si prefieres ejecutar directamente desde terminal:

```bash
brave \
  --remote-debugging-port=9333 \
  --no-first-run \
  --no-default-browser-check \
  --load-extension=/home/mariobox/Proyectos/GlyphLog/apps/extension/.output/chrome-mv3
```

---

## Testing de la Extensión

### Flujo 1: Emparejamiento Manual (Recomendado para Producción)

1. **Inicia Brave** con el script o comando arriba
2. **Abre el perfil** en GlyphLog:
   ```
   http://localhost:5173/profile
   ```
3. Ve a sección **"Dispositivos"**
4. Haz click en **"Nuevo dispositivo"**
5. Copia el **código de 6 dígitos** (válido 5 minutos)
6. Haz click en el **ícono de la extensión** (esquina superior derecha de Brave)
7. Ingresa el código en el popup
8. Confirma → el token se guarda automáticamente

### Flujo 2: Testing Rápido con Debug Token (Para Desarrollo)

Si solo quieres probar la detección rápidamente:

```bash
python3 << 'EOF'
import asyncio
import websockets
import json
import subprocess

# Usa un device token temporal generado para tu entorno local.
# No reutilices ni comitees tokens reales.
DEBUG_TOKEN = "<TOKEN_TEMPORAL_LOCAL>"

result = subprocess.run(["curl", "-s", "http://127.0.0.1:9333/json"], capture_output=True, text=True)
data = json.loads(result.stdout)
page_id = data[0]["id"]

async def inject():
    ws_url = f"ws://127.0.0.1:9333/devtools/page/{page_id}"
    async with websockets.connect(ws_url, ping_interval=None) as ws:
        msg = {"id": 1, "method": "Runtime.evaluate", "params": {
            "expression": f"localStorage.setItem('__glyphlog_debug_token', '{DEBUG_TOKEN}')"
        }}
        await ws.send(json.dumps(msg))
        await ws.recv()
        print("✅ Debug token injected")

asyncio.run(inject())
EOF
```

---

## Probar en Crunchyroll / MangaDex

### Crunchyroll (Anime)

1. Navega a: https://www.crunchyroll.com/es-es/series/GRMG8ZQZR/one-piece
2. Abre cualquier episodio
3. **Espera 2-3 segundos** (SPA detection)
4. Busca el overlay en la **esquina inferior derecha**
5. Debería mostrar: **"¿Marcar Ep. N?"**

### MangaDex (Manga)

1. Ve a: https://mangadex.org
2. Busca un manga (ej. "Kimetsu no Yaiba")
3. Abre un capítulo
4. **Espera 2-3 segundos**
5. Busca el overlay en la **esquina inferior derecha**
6. Debería mostrar: **"¿Marcar Cap. N?"**

---

## Debugging

### Ver Logs de la Extensión

1. Abre DevTools en Brave: **F12**
2. Ve a la pestaña **"Console"**
3. Busca mensajes que comiencen con `[GlyphLog]` o `[Background]`
4. Filtra por "glyphlog"

### Inspeccionar el Popup

1. Ve a `brave://extensions/`
2. Busca **"glyphlog-companion-extension"**
3. Haz click en **"Inspect"** (bajo la extensión)
4. Se abre DevTools del popup
5. En consola:
   ```javascript
   chrome.storage.local.get(null, r => console.log(r))
   ```
   Debería mostrar: `{ device_token: "dt_...", api_base_url: "http://localhost:8000" }`

### Ver Logs del Service Worker

1. Va a `brave://extensions/`
2. Busca **"glyphlog-companion-extension"**
3. Haz click en **"Inspect views: service worker"**
4. Console → verás logs de `[Background] ...`

---

## Problemas Comunes

| Problema | Solución |
|----------|----------|
| ❌ "Extension not found" | Ejecuta: `cd apps/extension && pnpm build` |
| ❌ Overlay no aparece | Abre DevTools (F12), filter "glyphlog", busca errores |
| ❌ Popup muestra "pairing" | Token no está guardado. Empareja de nuevo desde `/profile`; usa el Flujo 2 solo con un token temporal local. |
| ❌ Crunchyroll muestra "404" | URL incorrecta. Prueba con: `/es-es/series/GRMG8ZQZR/one-piece` |
| ❌ "Cannot connect to API" | Verifica que backend corre: `docker compose ps` |

---

## Arquitectura Técnica

```
Content Script (crunchyroll.ts)
  ↓ detecta media (anime/manga)
Background Service Worker (background.ts)
  ↓ API proxy (evita CORS)
Overlay (overlay.ts)
  ↓ muestra botones
Backend API (/api/v1/entries/progress)
  ↓ actualiza progreso
BD (PostgreSQL)
```

---

## Notas para Desarrollo

- **Storage:** Chrome.storage.local es aislado por extensión (seguro, persiste entre recargas)
- **Content Scripts:** Solo acceden a `chrome.runtime.sendMessage` → background
- **Background:** Puede hacer fetch directo + acceso a `chrome.storage.local`
- **SPA Detection:** Reintenta detectación cada 100ms durante 3 segundos (MangaDex toma tiempo renderizar)

---

## Próximos Pasos

- [ ] Arreglar carga automática sin flag `--load-extension` (bug de Brave)
- [ ] Agregar más adaptadores (Tachiyomi, Netflix, etc.)
- [ ] UI de popup más amigable para emparejamiento
- [ ] Tests E2E automatizados con Playwright

