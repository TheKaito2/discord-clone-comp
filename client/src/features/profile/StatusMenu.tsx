import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/auth'
import { getSocket } from '../../lib/socket'

const items: { value: 'online' | 'idle' | 'dnd' | 'offline'; label: string; dot: string }[] = [
  { value: 'online', label: 'Online', dot: 'bg-online' },
  { value: 'idle', label: 'Idle', dot: 'bg-idle' },
  { value: 'dnd', label: 'Do Not Disturb', dot: 'bg-dnd' },
  { value: 'offline', label: 'Invisible', dot: 'bg-offline' },
]

export default function StatusMenu({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const patch = useAuthStore((s) => s.patchUser)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClose])

  function pick(s: typeof items[number]['value']) {
    if (s === 'offline') {
      patch({ status: 'offline' })
    } else {
      patch({ status: s })
    }
    getSocket().emit('me:status', s)
    onClose()
  }

  if (!user) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-2 right-2 glass-panel rounded-lg shadow-elev2 py-2 overflow-hidden z-30 anim-scale-in"
    >
      <div className="px-3 py-2 border-b border-divider/60">
        <div className="text-text-hi font-semibold text-sm">{user.username}</div>
        <div className="text-text-sub text-xs capitalize">{user.status}</div>
      </div>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => pick(it.value)}
          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-hover-a"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${it.dot}`} />
          <span className="text-text-body text-sm">{it.label}</span>
        </button>
      ))}
    </div>
  )
}
