import { useState } from 'react'
import { useAuthStore } from '../store/auth'
import { Mic, Headphones, Settings, LogOut, Wifi, PhoneOff } from 'lucide-react'
import { disconnectSocket, getSocket } from '../lib/socket'
import { useNavigate, useParams } from 'react-router-dom'
import StatusMenu from '../features/profile/StatusMenu'
import { useVoiceStore } from '../store/voice'
import { useGuilds } from '../lib/queries'
import clsx from 'clsx'

const statusColor: Record<string, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-offline',
}
const statusLabel: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Invisible',
}

export default function UserPanel() {
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const nav = useNavigate()
  const { guildId } = useParams()
  const [menu, setMenu] = useState(false)
  const activeChannelId = useVoiceStore((s) => s.activeChannelId)
  const guilds = useGuilds()

  const activeVoice = activeChannelId
    ? guilds.data
        ?.flatMap((g) => g.channels.map((c) => ({ ...c, guildId: g.id, guildName: g.name })))
        .find((c) => c.id === activeChannelId) || null
    : null

  if (!user) return null

  function logout() {
    disconnectSocket()
    clear()
    nav('/login', { replace: true })
  }

  function disconnectVoice() {
    if (!activeChannelId) return
    getSocket().emit('voice:leave', { channelId: activeChannelId })
    useVoiceStore.getState().setActive(null)
  }

  return (
    <div className="relative bg-user-panel shrink-0">
      {activeVoice && (
        <div className="px-2 py-2 border-b border-rail/60 flex items-center gap-2">
          <Wifi size={14} className="text-online shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-online text-[12px] font-semibold leading-tight">Voice Connected</div>
            <button
              onClick={() => nav(`/app/${guildId || activeVoice.id}/${activeVoice.id}`)}
              className="text-text-sub hover:text-text-hi text-[11px] truncate w-full text-left"
              title={`#${activeVoice.name}`}
            >
              #{activeVoice.name} / {activeVoice.guildName}
            </button>
          </div>
          <button
            onClick={disconnectVoice}
            title="Disconnect"
            className="p-1.5 rounded text-text-sub hover:bg-hover-a hover:text-danger"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      )}
      <div className="relative h-[53px] px-2 flex items-center gap-2">
      {menu && <StatusMenu onClose={() => setMenu(false)} />}
      <button
        onClick={() => setMenu((v) => !v)}
        className="flex items-center gap-2 flex-1 min-w-0 rounded hover:bg-hover-a px-1.5 py-1 cursor-pointer text-left"
      >
        <div
          className="relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
          style={{ background: user.avatarColor }}
        >
          {user.username[0]?.toUpperCase()}
          <span className={clsx('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-user-panel', statusColor[user.status])} />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-text-hi truncate leading-tight">
            {user.username}
          </div>
          <div className="text-[12px] text-text-sub leading-tight truncate">{statusLabel[user.status] || 'Online'}</div>
        </div>
      </button>
      <button className="p-1.5 hover:bg-hover-a rounded text-text-sub hover:text-text-hi" title="Mute">
        <Mic size={18} />
      </button>
      <button className="p-1.5 hover:bg-hover-a rounded text-text-sub hover:text-text-hi" title="Deafen">
        <Headphones size={18} />
      </button>
      <button onClick={logout} className="p-1.5 hover:bg-hover-a rounded text-text-sub hover:text-danger" title="Log out">
        <LogOut size={18} />
      </button>
      <button className="p-1.5 hover:bg-hover-a rounded text-text-sub hover:text-text-hi" title="Settings">
        <Settings size={18} />
      </button>
      </div>
    </div>
  )
}
