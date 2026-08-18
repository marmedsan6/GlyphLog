import { lazy, Suspense } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/toaster'
import { queryClient } from '@/lib/query-client'
import { ProtectedRoute } from '@/components/shared/protected-route'
import { AppLayout } from '@/components/shared/app-layout'
import { PageSkeleton } from '@/components/shared/page-skeleton'
import { HomePage } from '@/pages/home/home.page'
import { LoginPage } from '@/pages/login/login.page'
import { RegisterPage } from '@/pages/register/register.page'
import { NotFoundPage } from '@/pages/not-found/not-found.page'

// Lazy loading de rutas protegidas para reducir bundle inicial
const CollectionPage = lazy(() =>
  import('@/pages/collection/collection.page').then((module) => ({ default: module.CollectionPage }))
)
const CreateEntryPage = lazy(() =>
  import('@/pages/create-entry/create-entry.page').then((module) => ({
    default: module.CreateEntryPage,
  }))
)
const EntryDetailPage = lazy(() =>
  import('@/pages/entry-detail/entry-detail.page').then((module) => ({
    default: module.EntryDetailPage,
  }))
)
const ImportPage = lazy(() =>
  import('@/pages/import/import.page').then((module) => ({ default: module.ImportPage }))
)
const ProfilePage = lazy(() =>
  import('@/pages/profile/profile.page').then((module) => ({ default: module.ProfilePage }))
)
const RecommendationsPage = lazy(() =>
  import('@/pages/recommendations/recommendations.page').then((module) => ({
    default: module.RecommendationsPage,
  }))
)
const ChatPage = lazy(() =>
  import('@/pages/chat/chat.page').then((module) => ({ default: module.ChatPage }))
)
const YoutubeDiscoveryPage = lazy(() =>
  import('@/pages/discover/youtube').then((module) => ({ default: module.YoutubeDiscoveryPage }))
)

const router = createBrowserRouter([
  // ── Rutas públicas ─────────────────────────────────────────────────────────
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  // TEMPORAL: preview de avatares para elegir estilo DiceBear. Eliminar al decidir.
  ...(import.meta.env.DEV
    ? [
        {
          path: '/avatar-preview',
          lazy: async () => {
            const { AvatarPreviewPage } = await import(
              '@/pages/avatar-preview/avatar-preview.page'
            )
            return { Component: AvatarPreviewPage }
          },
        },
      ]
    : []),

  // ── Rutas protegidas — requieren autenticación ─────────────────────────────
  // ProtectedRoute verifica la sesión. Si no hay token, redirige a /login.
  // AppLayout envuelve el contenido protegido con header y navegación.
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/collection',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <CollectionPage />
              </Suspense>
            ),
          },
          {
            path: '/entries/new',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <CreateEntryPage />
              </Suspense>
            ),
          },
          {
            path: '/entries/:id',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <EntryDetailPage />
              </Suspense>
            ),
          },
          {
            path: '/import',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <ImportPage />
              </Suspense>
            ),
          },
          {
            path: '/recommendations',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <RecommendationsPage />
              </Suspense>
            ),
          },
          {
            path: '/chat',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <ChatPage />
              </Suspense>
            ),
          },
          {
            path: '/discover/youtube',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <YoutubeDiscoveryPage />
              </Suspense>
            ),
          },
          {
            path: '/profile',
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <ProfilePage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])

// NOTA sobre Google OAuth:
// @react-oauth/google está instalada como dependencia, pero el componente
// GoogleLoginButton carga el script GSI directamente y usa el SDK
// `google.accounts.id` (no `useGoogleLogin`, que devuelve access_token).
// Ver comentario al inicio de google-login-button.tsx para el razonamiento
// completo. Mantener la dependencia preparada para usos futuros (ej:
// refresh tokens, hooks utilitarios como useGoogleOAuth).
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster />
        {/* DevTools de TanStack Query SOLO en desarrollo. La condición con
            import.meta.env.DEV es explícita: en el build de producción este
            panel (el círculo flotante + pop-up "TANSTACK") nunca se monta. */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools
            initialIsOpen={false}
            position="left"
            buttonPosition="bottom-left"
          />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
