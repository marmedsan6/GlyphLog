// Gestión del token de acceso JWT en sessionStorage.
//
// Decisión de seguridad (ADR-004):
// - sessionStorage persiste dentro de la misma pestaña del navegador.
// - Se pierde al cerrar la pestaña (más seguro que localStorage).
// - No es accesible desde otras pestañas ni ventanas.
// - Es vulnerable a XSS igual que localStorage, pero limita el alcance del ataque.
//
// Evolución prevista (post-MVP):
// Cuando el backend implemente refresh tokens con httpOnly cookies,
// migrar a: access token en memoria + silent refresh via cookie httpOnly.
//
// NUNCA almacenar en sessionStorage otros datos sensibles más allá del token.

const TOKEN_KEY = 'glyphlog_access_token'

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}
