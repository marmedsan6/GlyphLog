import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/toaster'
import { queryClient } from '@/lib/query-client'
import { ProtectedRoute } from '@/components/shared/protected-route'
import { AppLayout } from '@/components/shared/app-layout'
import { HomePage } from '@/pages/home/home.page'
import { LoginPage } from '@/pages/login/login.page'
import { RegisterPage } from '@/pages/register/register.page'
import { CollectionPage } from '@/pages/collection/collection.page'
import { CreateEntryPage } from '@/pages/create-entry/create-entry.page'
import { EntryDetailPage } from '@/pages/entry-detail/entry-detail.page'
import { NotFoundPage } from '@/pages/not-found/not-found.page'

const router = createBrowserRouter([
  // ── Rutas públicas ─────────────────────────────────────────────────────────
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // ── Rutas protegidas — requieren autenticación ─────────────────────────────
  // ProtectedRoute verifica la sesión. Si no hay token, redirige a /login.
  // AppLayout envuelve el contenido protegido con header y navegación.
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/collection', element: <CollectionPage /> },
          { path: '/entries/new', element: <CreateEntryPage /> },
          { path: '/entries/:id', element: <EntryDetailPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster />
        {/* ReactQueryDevtools se excluye automáticamente en producción
            cuando NODE_ENV=production (Vite lo establece durante el build) */}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
