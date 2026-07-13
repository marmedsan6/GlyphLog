import { Area } from 'react-easy-crop'

/**
 * Crea un objeto HTMLImageElement a partir de un URL o base64
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // Evitar problemas de CORS si la imagen viene de origen externo
    image.src = url
  })

/**
 * Recorta la imagen basándose en las coordenadas de píxeles proporcionadas por react-easy-crop.
 * Devuelve un archivo File recortado listo para ser subido al servidor.
 */
export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  fileName = 'cropped-cover.jpg'
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D del canvas')
  }

  // Establecer el tamaño del canvas igual al tamaño del recorte final
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Dibujar la porción recortada de la imagen original en el canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Exportar el contenido del canvas como un archivo File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('El Canvas está vacío o falló la conversión'))
          return
        }
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        resolve(file)
      },
      'image/jpeg',
      0.92
    )
  })
}
