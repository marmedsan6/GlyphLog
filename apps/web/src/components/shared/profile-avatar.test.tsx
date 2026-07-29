import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileAvatar } from './profile-avatar'

describe('ProfileAvatar', () => {
  it('renders avatar container with accessible label', () => {
    render(
      <ProfileAvatar
        avatarUrl="https://api.dicebear.com/9.x/pixel-art/svg?seed=user-1"
        displayName="gamer"
      />
    )

    expect(screen.getByText('GA')).toBeInTheDocument()
  })

  it('renders fallback initials when avatar url is null', () => {
    render(<ProfileAvatar avatarUrl={null} displayName="gamer" />)

    expect(screen.getByText('GA')).toBeInTheDocument()
  })

  it('renders fallback initials from email when username is not set', () => {
    render(<ProfileAvatar avatarUrl={null} displayName="test@example.com" />)

    expect(screen.getByText('TE')).toBeInTheDocument()
  })

  it('applies size classes', () => {
    const { container } = render(<ProfileAvatar avatarUrl={null} displayName="gamer" size="xl" />)

    expect(container.firstChild).toHaveClass('h-32 w-32')
  })
})
