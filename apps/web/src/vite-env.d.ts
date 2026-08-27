/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_COMPANION_EXTENSION_ID: string
  readonly VITE_COMPANION_STORE_URL: string
  readonly MODE: 'development' | 'production'
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*?inline' {
  const content: string
  export default content
}
