/**
 * Utilidades para leer un archivo de exportación (MAL/AniList/Kitsu/Steam)
 * en el wizard de importación.
 *
 * Soporta `.xml`, `.json`, `.txt` y `.gz` (se descomprime en el navegador
 * con DecompressionStream, sin coste de red).
 */

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB — suficiente para exports grandes

/** True si la extensión del archivo indica un gzip. */
export function isGzFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.gz')
}

/** Extensiones que el wizard acepta (texto plano y gz). */
export function isSupportedImportFile(fileName: string): boolean {
  return /\.(xml|json|txt|gz)$/i.test(fileName)
}

async function decompressGz(blob: Blob): Promise<string> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

/**
 * Lee un archivo de importación y devuelve su contenido como texto.
 * Si el archivo es `.gz`, lo descomprime antes. Lanza Error con mensaje
 * descriptivo si el tipo/size no es válido.
 */
export async function readImportFile(file: File): Promise<string> {
  if (!isSupportedImportFile(file.name)) {
    throw new Error(
      'Formato no soportado. Sube un archivo .xml, .json, .txt o .gz de MyAnimeList, AniList o Steam.'
    )
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo supera los 3MB. Prueba importar la lista en dos partes.')
  }

  if (isGzFile(file.name)) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error(
        'Tu navegador no puede descomprimir .gz automáticamente. Descomprime el archivo y pega el XML.'
      )
    }
    return decompressGz(file)
  }

  return file.text()
}