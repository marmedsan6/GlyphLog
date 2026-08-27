import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPage } from './privacy.page'

describe('PrivacyPage', () => {
  it('explica el tratamiento de Companion sin pedir el JWT', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /privacidad de glyphlog companion/i })).toBeInTheDocument()
    expect(screen.getByText(/código de emparejamiento de 6 caracteres/i)).toBeInTheDocument()
    expect(screen.getAllByText(/token de dispositivo/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/90 días/i)).toBeInTheDocument()
    expect(screen.getByText(/Crunchyroll, AnimeFLV y MangaDex/i)).toBeInTheDocument()
    expect(screen.getByText(/No se usa el token de sesión \(JWT\)/i)).toBeInTheDocument()
  })
})
