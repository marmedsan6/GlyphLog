import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from './create-test-query-client'

interface TestQueryProviderProps {
  children: React.ReactNode
}

export function TestQueryProvider({ children }: TestQueryProviderProps) {
  const queryClient = createTestQueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
