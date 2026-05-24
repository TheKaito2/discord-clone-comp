import { Link, useParams } from 'react-router-dom'
import { Hash, Volume2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import type { Channel, Guild } from '../lib/queries'
import { useVoiceStore } from '../store/voice'

export default function ChannelSidebar({ guild }: { guild: Guild }) {
  const { channelId } = useParams()
  const byCategory = guild.channels.reduce<Record<string, Channel[]>>((acc, c) => {
    ;(acc[c.category] ||= []).push(c)
    return acc
  }, {})

  return (
    <aside className="w-sidebar bg-panel flex flex-col shrink-0 h-full">
      <header className="h-12 px-4 flex items-center justify-between border-b border-rail/60 shadow-elev1">
        <span className="text-text-hi font-semibold text-[15px] truncate">{guild.name}</span>
        <span className="text-text-sub text-xs">▾</span>
      </header>

      <div className="flex-1 overflow-y-auto py-2">
        {Object.entries(byCategory).map(([cat, list]) => (
          <Category key={cat} name={cat} channels={list} activeId={channelId} guildId={guild.id} />
        ))}
      </div>
    </aside>
  )
}

function Category({
  name,
  channels,
  activeId,
  guildId,
}: {
  name: string
  channels: Channel[]
  activeId?: string
  guildId: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full px-2 py-1 text-text-sub hover:text-text-hi"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="cap">{name}</span>
      </button>
      {open &&
        channels.map((c) => {
          const Icon = c.type === 'voice' ? Volume2 : Hash
          const active = activeId === c.id
          return (
            <div key={c.id}>
              <Link
                to={`/app/${guildId}/${c.id}`}
                className={clsx('chan-row', active && 'active')}
              >
                <Icon size={20} className="shrink-0 text-text-dim" />
                <span className="truncate text-[15px] leading-5">{c.name}</span>
              </Link>
              {c.type === 'voice' && <VoiceRoster channelId={c.id} />}
            </div>
          )
        })}
    </div>
  )
}

function VoiceRoster({ channelId }: { channelId: string }) {
  const members = useVoiceStore((s) => s.roster[channelId] || [])
  const speaking = useVoiceStore((s) => s.speakingUsers)
  if (members.length === 0) return null
  return (
    <div className="pl-8 pr-2 pb-1">
      {members.map((m) => (
        <div
          key={m.socketId}
          className={clsx(
            'flex items-center gap-2 px-2 py-1 rounded text-[13px] text-text-sub hover:bg-hover-a hover:text-text-mute',
            speaking.has(m.userId) && 'text-online',
          )}
        >
          <div className="w-6 h-6 rounded-full bg-brand grid place-items-center text-[10px] font-semibold text-white">
            {m.username[0]?.toUpperCase()}
          </div>
          <span className="truncate">{m.username}</span>
        </div>
      ))}
    </div>
  )
}
