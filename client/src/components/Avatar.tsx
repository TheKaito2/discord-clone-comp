import clsx from 'clsx'

type Props = {
  username: string
  avatarColor?: string
  avatarUrl?: string
  size?: number
  className?: string
}

// Shared avatar — image if avatarUrl present, otherwise color circle with initial.
export default function Avatar({ username, avatarColor, avatarUrl, size = 32, className }: Props) {
  const initial = username?.[0]?.toUpperCase() || '?'
  const fontSize = size <= 24 ? 11 : size <= 32 ? 13 : size <= 40 ? 15 : Math.round(size * 0.4)
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        width={size}
        height={size}
        className={clsx('rounded-full object-cover shrink-0', className)}
        style={{ width: size, height: size }}
        draggable={false}
      />
    )
  }
  return (
    <div
      className={clsx('rounded-full flex items-center justify-center text-white font-semibold shrink-0', className)}
      style={{ width: size, height: size, background: avatarColor || '#5865F2', fontSize }}
    >
      {initial}
    </div>
  )
}
