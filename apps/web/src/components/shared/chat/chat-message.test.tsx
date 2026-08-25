import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from './chat-message'
import type { AIChatMessage } from '@/hooks/useAIChat'
import type { ChatMessageMetadata } from '@/services/ai.service'
import { TestQueryProvider } from '@/test/query-client-provider'

function makeMessage(
  content: string,
  role: AIChatMessage['role'] = 'assistant',
  metadata?: ChatMessageMetadata
): AIChatMessage {
  return { id: `${role}-1`, role, content, metadata }
}

describe('ChatMessage', () => {
  it('renderiza CommonMark y GFM con estilos semánticos', () => {
    const content = [
      '# GlyphAI',
      '',
      '**Fuerte** y *énfasis* con `inline`.',
      '',
      '- Primer elemento',
      '- Segundo elemento',
      '- [x] Tarea completada',
      '',
      '~~Texto tachado~~',
      '',
      '| Formato | Soporte |',
      '| --- | --- |',
      '| GFM | Sí |',
      '',
      '> Una nota útil',
      '',
      '```ts',
      'const answer = 42',
      '```',
    ].join('\n')

    const { container } = render(<ChatMessage message={makeMessage(content)} />)

    expect(screen.getByRole('heading', { name: 'GlyphAI' })).toBeDefined()
    expect(screen.getByText('Fuerte').tagName).toBe('STRONG')
    expect(screen.getByText('énfasis').tagName).toBe('EM')
    expect(screen.getByText('inline').tagName).toBe('CODE')
    expect(screen.getByRole('list')).toBeDefined()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByText('Texto tachado').tagName).toBe('DEL')
    expect(screen.getByRole('table')).toBeDefined()
    expect(screen.getByRole('columnheader', { name: 'Formato' })).toBeDefined()
    expect(screen.getByText('Una nota útil').tagName).toBe('P')
    expect(screen.getByText('const answer = 42').tagName).toBe('CODE')
    expect(container.querySelector('pre')).toBeDefined()
  })

  it('mantiene los mensajes del usuario como texto plano', () => {
    const { container } = render(<ChatMessage message={makeMessage('**no interpretar**', 'user')} />)

    expect(screen.getByText('**no interpretar**')).toBeDefined()
    expect(container.querySelector('strong')).toBeNull()
  })

  it('protege enlaces externos y conserva los enlaces relativos', () => {
    render(
      <ChatMessage
        message={makeMessage('[Externo](https://example.com) y [interno](/coleccion)')}
      />
    )

    expect(screen.getByRole('link', { name: 'Externo' })).toHaveAttribute(
      'target',
      '_blank'
    )
    expect(screen.getByRole('link', { name: 'Externo' })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    )
    expect(screen.getByRole('link', { name: 'interno' })).not.toHaveAttribute('target')
  })

  it('neutraliza URLs inseguras y omite HTML crudo', () => {
    const { container } = render(
      <ChatMessage
        message={makeMessage(
          '[malicioso](javascript:alert(1)) ![tracking](data:text/html,alert(1)) <script>alert(1)</script>'
        )}
      />
    )

    expect(screen.getByText('malicioso').closest('a')).toHaveAttribute('href', '')
    expect(screen.getByAltText('tracking')).toHaveAttribute('src', '')
    expect(container.querySelector('script')).toBeNull()
  })

  it('renderiza imágenes seguras con atributos defensivos', () => {
    render(
      <ChatMessage message={makeMessage('![portada](https://cdn.example.com/cover.webp)')} />
    )

    expect(screen.getByAltText('portada')).toHaveAttribute(
      'src',
      'https://cdn.example.com/cover.webp'
    )
    expect(screen.getByAltText('portada')).toHaveAttribute('loading', 'lazy')
    expect(screen.getByAltText('portada')).toHaveAttribute('decoding', 'async')
    expect(screen.getByAltText('portada')).toHaveAttribute('referrerpolicy', 'no-referrer')
  })

  it('conserva el indicador y actualiza Markdown durante el streaming', () => {
    const { rerender } = render(
      <ChatMessage message={makeMessage('')} isStreaming />
    )

    expect(screen.getByLabelText('GlyphAI está escribiendo')).toBeDefined()

    rerender(<ChatMessage message={makeMessage('**Frieren**')} isStreaming />)

    expect(screen.getByText('Frieren').tagName).toBe('STRONG')
    expect(screen.queryByLabelText('GlyphAI está escribiendo')).toBeNull()
  })

  it('mantiene las tarjetas estructuradas después del Markdown', () => {
    render(
      <TestQueryProvider>
        <ChatMessage
          message={makeMessage('Respuesta', 'assistant', {
            recommendations: [
              {
                title: 'Frieren',
                type: 'anime',
                match_percentage: 95,
                reason: 'Una aventura fantástica',
                genres: ['Fantasy'],
                year: 2023,
                external_url: null,
                cover_image_url: null,
                similar_to: [],
              },
            ],
            suggestions: [
              {
                title: 'Solo Leveling',
                type: 'anime',
                mentioned_by: 'Canal Anime',
                video_title: 'Novedades anime',
                video_url: 'https://youtube.com/watch?v=demo',
                opinion: 'positive',
                rating: 9,
                timestamp: null,
                in_collection: false,
                external_url: null,
                cover_image_url: null,
              },
            ],
          })}
        />
      </TestQueryProvider>
    )

    expect(screen.getByText('Respuesta')).toBeDefined()
    expect(screen.getByText('Frieren')).toBeDefined()
    expect(screen.getByText('Solo Leveling')).toBeDefined()
    expect(screen.getByRole('link', { name: /Ver vídeo/i })).toBeDefined()
  })
})
