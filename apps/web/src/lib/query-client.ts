import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos considerados frescos durante 5 minutos
      staleTime: 1000 * 60 * 5,
      // Un solo reintento automático ante errores de red
      retry: 1,
      // No refetch al volver a enfocar la ventana (evita requests innecesarias)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Sin reintentos automáticos en mutaciones — el usuario decide si reintentar
      retry: 0,
    },
  },
})
