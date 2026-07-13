import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createTestQueryClient } from './create-test-query-client'

interface TestQueryProviderProps {
  children: React.ReactNode
}

export function TestQueryProvider({ children }: TestQueryProviderProps) {
  const queryClient = createTestQueryClient()
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
}
