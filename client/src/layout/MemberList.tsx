import type { Member } from '../lib/queries'
import clsx from 'clsx'
import Avatar from '../components/Avatar'

function statusColor(s: Member['status']) {
  return s === 'online' ? 'bg-online' : s === 'idle' ? 'bg-idle' : s === 'dnd' ? 'bg-dnd' : 'bg-offline'
}

export default function MemberList({ members }: { members: Member[] }) {
  const online = members.filter((m) => m.status !== 'offline')
  const offline = members.filter((m) => m.status === 'offline')

  return (
    <aside className="w-members bg-panel flex flex-col shrink-0 border-l border-rail/60">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="cap px-2 mb-2">Online — {online.length}</div>
        {online.map((m) => (
          <MemberRow key={m.id} m={m} />
        ))}
        <div className="cap px-2 mb-2 mt-4">Offline — {offline.length}</div>
        {offline.map((m) => (
          <MemberRow key={m.id} m={m} dim />
        ))}
      </div>
    </aside>
  )
}

function MemberRow({ m, dim }: { m: Member; dim?: boolean }) {
  return (
    <div className={clsx('flex items-center gap-3 px-2 py-1.5 rounded hover:bg-hover-a', dim && 'opacity-60')}>
      <div className="relative shrink-0">
        <Avatar username={m.username} avatarColor={m.avatarColor} avatarUrl={m.avatarUrl} size={32} />
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-panel',
            statusColor(m.status),
          )}
        />
      </div>
      <span className="text-[15px] text-text-sub truncate">{m.username}</span>
    </div>
  )
}
