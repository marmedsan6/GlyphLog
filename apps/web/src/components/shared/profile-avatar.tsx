import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/utils/avatar-url'

interface ProfileAvatarProps {
  avatarUrl: string | null
  displayName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
}

export function ProfileAvatar({
  avatarUrl,
  displayName,
  size = 'md',
  className,
}: ProfileAvatarProps) {
  const src = getAvatarUrl(avatarUrl)
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <Avatar className={`${sizeClasses[size]} ${className ?? ''}`}>
      <AvatarImage src={src} alt={`Avatar de ${displayName}`} />
      <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
    </Avatar>
  )
}
