import { Link, useParams } from 'react-router-dom'
import { Hash, Volume2, ChevronDown, ChevronRight, Bell, UserPlus, Pin, Settings as SettingsIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Channel, Guild } from '../lib/queries'
import { useVoiceStore } from '../store/voice'

export default function ChannelSidebar({ guild }: { guild: Guild }) {
  const { channelId } = useParams()
  const byCategory = guild.channels.reduce<Record<string, Channel[]>>((acc, c) => {
    ;(acc[c.category] ||= []).push(c)
    return acc
  }, {})
  const [menu, setMenu] = useState(false)
  const [allOpen, setAllOpen] = useState(true)
  const [showBrowse, setShowBrowse] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    if (menu) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menu])

  return (
    <aside className="w-sidebar bg-panel flex flex-col shrink-0 h-full">
      {/* Server banner — 240×135 with linear gradient overlay per d19 spec */}
      <div className="relative w-sidebar h-[135px] overflow-hidden shrink-0 group">
        <img
          src="/server-banner.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-b from-transparent via-panel/40 to-panel" />
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 h-5 rounded-full bg-black/45 backdrop-blur text-[10px] font-bold uppercase tracking-cap text-white/90">
          <span className="w-1.5 h-1.5 rounded-full bg-online animate-pulse-soft" />
          Live
        </div>
      </div>

      {/* Server header — d19: 240×48, padding 12/16, font 15/600/#FFF */}
      <header className="relative h-12 px-4 flex items-center justify-between border-b border-rail/60 shadow-elev1 shrink-0">
        <button
          onClick={() => setMenu((v) => !v)}
          className="flex-1 flex items-center justify-between text-left h-full"
        >
          <span className="text-text-hi font-semibold text-[15px] leading-5 truncate">{guild.name}</span>
          <span className={clsx('text-text-mute text-xs transition-transform', menu && 'rotate-180')}>▾</span>
        </button>
        {menu && (
          <div
            ref={menuRef}
            className="absolute top-12 left-2 right-2 bg-rail rounded-md shadow-elev1 py-1 z-30 border border-divider/40"
          >
            <ServerMenuItem icon={UserPlus} label="Invite People" onClick={() => { setMenu(false); navigator.clipboard?.writeText(guild.inviteCode || '').catch(() => {}) }} hint={guild.inviteCode} />
            <ServerMenuItem icon={Bell} label="Notification Settings" onClick={() => setMenu(false)} />
            <ServerMenuItem icon={Pin} label="Pinned Messages" onClick={() => setMenu(false)} />
            <div className="h-px bg-divider/60 my-1" />
            <ServerMenuItem icon={SettingsIcon} label="Server Settings" onClick={() => setMenu(false)} />
          </div>
        )}
      </header>

      {/* Channel scroll area */}
      <div className="flex-1 overflow-y-auto pt-4 pb-2">
        {/* Browse Channels row — d19: 224×32 — opens modal listing all */}
        <button
          onClick={() => setShowBrowse(true)}
          className="mx-2 flex items-center gap-1.5 w-[calc(100%-1rem)] h-8 px-2 rounded-[4px] text-text-sub hover:bg-hover-a hover:text-text-mute transition-colors"
          title="Browse all channels"
        >
          <Hash size={20} className="shrink-0 text-text-dim" />
          <span className="text-[15px] leading-5 font-medium">Browse Channels</span>
        </button>

        {Object.entries(byCategory).map(([cat, list]) => (
          <Category
            key={cat}
            name={cat}
            channels={list}
            activeId={channelId}
            guildId={guild.id}
            forceOpen={allOpen}
            collapseKey={allOpen ? 1 : 0}
          />
        ))}

        {Object.keys(byCategory).length > 1 && (
          <button
            onClick={() => setAllOpen((v) => !v)}
            className="mx-2 mt-3 text-[12px] text-text-sub hover:text-text-hi tracking-cap uppercase font-semibold leading-4"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {showBrowse && <BrowseChannelsModal guild={guild} onClose={() => setShowBrowse(false)} />}
    </aside>
  )
}

function ServerMenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof UserPlus
  label: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 h-8 text-[14px] text-text-sub hover:bg-brand hover:text-white rounded transition-colors"
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {hint && <span className="text-[11px] opacity-70">{hint}</span>}
    </button>
  )
}

function BrowseChannelsModal({ guild, onClose }: { guild: Guild; onClose: () => void }) {
  const [q, setQ] = useState('')
  const filtered = guild.channels.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center anim-fade-in p-4" onClick={onClose}>
      <div className="glass-panel rounded-xl w-[520px] max-h-[70vh] flex flex-col anim-scale-in shadow-elev2" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-4 border-b border-divider/40 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[18px] font-bold text-text-hi">Browse Channels</h3>
            <p className="text-[13px] text-text-mute">{guild.name}</p>
          </div>
          <button onClick={onClose} className="text-text-sub hover:text-text-hi"><X size={18} /></button>
        </header>
        <div className="p-4 shrink-0">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search channels"
            className="w-full bg-rail rounded h-8 px-3 text-[13px] text-text-body placeholder:text-text-sub outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/app/${guild.id}/${c.id}`}
              onClick={onClose}
              className="flex items-center gap-2 px-3 h-10 rounded text-text-sub hover:bg-hover-a hover:text-text-hi"
            >
              {c.type === 'voice' ? <Volume2 size={18} /> : <Hash size={18} />}
              <span className="text-[14px] flex-1 truncate">{c.name}</span>
              <span className="text-[11px] text-text-sub uppercase tracking-cap">{c.category}</span>
            </Link>
          ))}
          {filtered.length === 0 && <div className="text-center text-text-sub py-6 text-[14px]">No channels match.</div>}
        </div>
      </div>
    </div>
  )
}

function Category({
  name,
  channels,
  activeId,
  guildId,
  forceOpen,
  collapseKey,
}: {
  name: string
  channels: Channel[]
  activeId?: string
  guildId: string
  forceOpen: boolean
  collapseKey: number
}) {
  const [open, setOpen] = useState(true)
  useEffect(() => { setOpen(forceOpen) }, [forceOpen, collapseKey])
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
                    'mx-2 flex items-center gap-1.5 w-[calc(100%-1rem)] h-8 pl-2 pr-5 rounded-[4px] transition-all relative',
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
