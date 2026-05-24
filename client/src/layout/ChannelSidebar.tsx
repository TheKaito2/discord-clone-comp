import { Link, useParams } from 'react-router-dom'
import { Hash, Volume2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import type { Channel, Guild } from '../lib/queries'

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
            <Link
              key={c.id}
              to={`/app/${guildId}/${c.id}`}
              className={clsx('chan-row', active && 'active')}
            >
              <Icon size={20} className="shrink-0 text-text-dim" />
              <span className="truncate text-[15px] leading-5">{c.name}</span>
            </Link>
          )
        })}
    </div>
  )
}
