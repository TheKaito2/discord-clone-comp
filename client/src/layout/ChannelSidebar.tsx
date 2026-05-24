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
      {/* Server banner — 240×135 with linear gradient overlay per d19 spec */}
      <div className="relative w-sidebar h-[135px] overflow-hidden shrink-0">
        <img src="/server-banner.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-[58px] bg-gradient-to-b from-transparent to-black/60" />
      </div>

      {/* Server header — d19: 240×48, padding 12/16, font 15/600/#FFF */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-rail/60 shadow-elev1 shrink-0">
        <span className="text-text-hi font-semibold text-[15px] leading-5 truncate">{guild.name}</span>
        <span className="text-text-sub text-xs">▾</span>
      </header>

      {/* Channel scroll area */}
      <div className="flex-1 overflow-y-auto pt-4 pb-2">
        {/* Browse Channels row — d19: 224×32, radius 4, padding 8 horiz, gap 6 */}
        <button className="mx-2 flex items-center gap-1.5 w-[calc(100%-1rem)] h-8 px-2 rounded-[4px] text-text-sub hover:bg-hover-a hover:text-text-mute transition-colors">
          <Hash size={20} className="shrink-0 text-text-dim" />
          <span className="text-[15px] leading-5">Browse Channels</span>
        </button>

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
    <div className="mt-4">
      {/* Category row — d19: 232×24, padding T=4 R=8 B=4 L=16 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full pl-4 pr-2 h-6 text-text-sub hover:text-text-hi"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="uppercase tracking-cap text-[12px] font-semibold leading-4">{name}</span>
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {channels.map((c) => {
            const Icon = c.type === 'voice' ? Volume2 : Hash
            const active = activeId === c.id
            return (
              <div key={c.id}>
                {/* Channel row — d19: 224×32, padding L=8 R=20 (active) or L=8 R=8 (idle), radius 4, gap 6, icon 20 */}
                <Link
                  to={`/app/${guildId}/${c.id}`}
                  className={clsx(
                    'mx-2 flex items-center gap-1.5 w-[calc(100%-1rem)] h-8 pl-2 pr-5 rounded-[4px] transition-colors',
                    active
                      ? 'bg-active-a text-text-hi'
                      : 'text-text-sub hover:bg-hover-a hover:text-text-mute',
                  )}
                >
                  <Icon size={20} className="shrink-0 text-text-dim" />
                  <span className="truncate text-[15px] leading-5 font-medium">{c.name}</span>
                </Link>
                {c.type === 'voice' && <VoiceRoster channelId={c.id} />}
              </div>
            )
          })}
        </div>
      )}
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
