# [FEAT] Image cropper para portadas subidas por el usuario

> **Estado:** backlog
> **Prioridad:** baja
> **Severidad:** P3 — minor (mejora de UX, no es un bug)
> **Dependencias:** ninguna

## Contexto

Actualmente, cuando el usuario sube una imagen de portada, se muestra con `object-cover` en un contenedor fijo de ratio 3:4. Esto significa que la imagen se recorta automáticamente desde el centro, y el usuario no tiene control sobre qué parte de la imagen se ve. Para imágenes que no son 3:4 (paisajes, panorámicas, imágenes muy verticales), el resultado puede ser insatisfactorio.

El componente `ImageUploader` (`apps/web/src/components/shared/entry-form/image-uploader.tsx`) muestra una preview estática de 160px de alto. No existe ninguna librería de image cropping en el proyecto.

Adicionalmente, la imagen en la vista de detalle (`entry-detail-view.tsx`) se muestra en una columna de 300px con ratio 3:4, y en las `EntryCard` de la colección se muestra en tarjetas pequeñas. El usuario quiere que la imagen se vea **más grande** en la vista de detalle.

## Objetivo

Permitir al usuario ajustar la posición y zoom de la imagen de portada antes de subirla (solo para archivos locales, no para imágenes de catálogo externo), y mostrar la imagen más grande en la vista de detalle.

## Historia de usuario

**Como** usuario de GlyphLog
**Quiero** poder mover y hacer zoom a la imagen de portada que subo desde mi ordenador
**Para** controlar qué parte de la imagen se muestra en mi colección

### Criterios de aceptación
- ✅ Cuando subo un archivo de imagen local, aparece un editor con controles de zoom y arrastre
- ✅ Puedo hacer zoom in/out con un slider
- ✅ Puedo arrastrar la imagen para reposicionarla dentro del marco 3:4
- ✅ La imagen recortada resultante se sube al servidor (no la original)
- ✅ Las imágenes de catálogo externo (Jikan/RAWG) NO muestran el cropper (se usan tal cual)
- ✅ La imagen en la vista de detalle se muestra más grande que los 300px actuales
- ✅ No se rompe el flujo existente de subida de portada
- ✅ El cropper funciona correctamente en modo claro y oscuro

### Fuera de alcance (explícito)
- ❌ Crop libre (seleccionar área rectangular arbitraria)
- ❌ Rotación de imagen
- ❌ Crop de imágenes de catálogo externo
- ❌ Procesamiento de imagen en el backend (todo se hace en el cliente con Canvas)

## Tareas técnicas

### Track A: Image Cropper

- [ ] Instalar `react-easy-crop` como dependencia en `apps/web`
- [ ] Crear componente `ImageCropper` en `apps/web/src/components/shared/entry-form/image-cropper.tsx` que:
  - Reciba un `File` o `ObjectURL` como fuente
  - Muestre el área de crop con ratio 3/4
  - Tenga un slider de zoom (min: 1, max: 3, step: 0.1)
  - Permita arrastrar la imagen
  - Exponga un callback `onCropComplete(croppedFile: File)` que use Canvas API para generar el archivo recortado
- [ ] Integrar `ImageCropper` en `ImageUploader`: cuando el usuario selecciona un archivo local, mostrar el cropper en lugar de la preview estática
- [ ] El archivo recortado (`File`) es el que se pasa a `onChange()` para su posterior subida
- [ ] Cuando la imagen viene de catálogo externo (`currentImageUrl` es una URL absoluta http/https), NO mostrar el cropper — mantener la preview actual

### Track B: Imagen más grande en vista de detalle

- [ ] Modificar `entry-detail-view.tsx`: aumentar la columna de imagen de `300px` a `350px` o `400px` (evaluar qué queda mejor)
- [ ] Opcionalmente, añadir un click en la imagen para verla en tamaño completo (lightbox simple con un dialog de shadcn/ui)

### Track C: Tests

- [ ] Test básico del componente `ImageCropper`: renderiza, acepta zoom, dispara `onCropComplete`
- [ ] Verificar que `ImageUploader` sigue funcionando correctamente sin cropper (imágenes de catálogo)

## Criterios de aceptación técnicos

- ✅ `react-easy-crop` instalado y funcionando
- ✅ El cropper solo aparece para archivos locales (no URLs externas)
- ✅ El archivo subido al servidor es el recortado, no el original
- ✅ La imagen en `entry-detail-view.tsx` es más grande que 300px
- ✅ El cropper respeta el ratio 3:4
- ✅ Funciona en modo claro y oscuro
- ✅ No se rompe ningún test existente (210 tests)
- ✅ El bundle size incrementa menos de 15KB gzip (react-easy-crop pesa ~8KB gzip)

## Notas técnicas

### Por qué `react-easy-crop`

| Librería | Bundle | Ratio fijo | Zoom | Drag | API |
|----------|--------|-----------|------|------|-----|
| `react-easy-crop` | ~8KB gzip | ✅ | ✅ | ✅ | Simple, callback-based |
| `react-advanced-cropper` | ~40KB gzip | ✅ | ✅ | ✅ | Compleja, demasiadas features |
| `react-image-crop` | ~12KB gzip | ✅ | ❌ (manual) | ✅ | Requiere más código custom |

`react-easy-crop` es la opción más ligera y simple para el caso de uso (zoom + drag con ratio fijo 3:4). No necesitamos crop libre ni rotación.

### Estrategia de crop en cliente

1. El usuario selecciona un archivo → se abre el cropper
2. El usuario ajusta zoom y posición
3. `onCropComplete` proporciona las coordenadas del área visible (`croppedAreaPixels`)
4. Usamos `Canvas API` para renderizar solo esa porción de la imagen original
5. `canvas.toBlob()` genera un nuevo `File` que es el que se sube al servidor
6. El backend no necesita cambios — recibe un archivo normal

### Imágenes de catálogo externo

Las URLs de Jikan/RAWG son servidas por CDNs externos. No podemos (ni debemos) manipularlas con Canvas por CORS. Para estas imágenes:
- Se muestra la preview actual (sin cropper)
- Se sube la URL como `cover_image_url` para que el backend la descargue (flujo existente)
- En la vista de detalle, la imagen se muestra más grande (Track B aplica a todas las imágenes, locales y externas)

## Archivos relevantes

- `apps/web/src/components/shared/entry-form/image-uploader.tsx` — integrar cropper
- `apps/web/src/components/shared/entry-form/image-cropper.tsx` — nuevo componente
- `apps/web/src/pages/entry-detail/entry-detail-view.tsx` — agrandar imagen
- `apps/web/src/pages/create-entry/create-entry.page.tsx` — consumidor del ImageUploader
- `apps/web/src/pages/entry-detail/entry-edit-form.tsx` — consumidor del ImageUploader
- `apps/web/package.json` — añadir `react-easy-crop`

## Validación INVEST

- [x] **Independent:** No depende de otros issues. Feature autocontenida.
- [x] **Negotiable:** El nivel de zoom, el tamaño de la imagen en detalle, y si se añade lightbox son negociables.
- [x] **Valuable:** Mejora significativa de UX para portadas que no son 3:4.
- [x] **Estimable:** 1.5-2 horas (cropper + integración + tests + vista detalle).
- [x] **Small:** 3 archivos nuevos/modificados, 1 dependencia nueva.
- [x] **Testable:** Subir imagen → ver cropper → ajustar → verificar que la imagen guardada está recortada. Binario.
