import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Compass, Sparkles, Gamepad2, Music, GraduationCap, Palette, Globe, Search, Hash, Volume2, Users } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import UserPanel from '../layout/UserPanel'
import { useNavigate } from 'react-router-dom'

type PublicGuild = {
  id: string
  name: string
  inviteCode: string
  iconUrl: string
  bannerUrl: string
  memberCount: number
  channelCount: number
}

const CATS = [
  { key: 'home', label: 'Home', icon: Sparkles },
  { key: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { key: 'music', label: 'Music', icon: Music },
  { key: 'edu', label: 'Education', icon: GraduationCap },
  { key: 'art', label: 'Creative Arts', icon: Palette },
  { key: 'science', label: 'Science', icon: Globe },
] as const

export default function DiscoverView() {
  const [cat, setCat] = useState<(typeof CATS)[number]['key']>('home')
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const qc = useQueryClient()
  const guilds = useQuery({
    queryKey: ['discover-guilds'],
    queryFn: async () => (await api.get<PublicGuild[]>('/discover/guilds')).data,
  })

  const filtered = (guilds.data || []).filter((g) =>
    g.name.toLowerCase().includes(q.trim().toLowerCase()),
  )

  async function join(g: PublicGuild) {
    await api.post(`/invites/${g.inviteCode}/join`)
    await qc.invalidateQueries({ queryKey: ['guilds'] })
    nav(`/app/${g.id}`)
  }

  return (
    <>
      {/* Sidebar — d18 categories */}
      <aside className="w-sidebar bg-panel shrink-0 h-full flex flex-col">
        <header className="h-12 px-3 flex items-center border-b border-rail/60 shadow-elev1 shrink-0 gap-2">
          <Compass size={20} className="text-text-dim" />
          <span className="text-text-hi font-semibold text-[15px]">Discover</span>
        </header>
        <div className="flex-1 overflow-y-auto py-2">
          {CATS.map((c) => {
            const Icon = c.icon
            const active = cat === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={clsx(
                  'mx-2 mt-0.5 flex items-center gap-3 w-[calc(100%-1rem)] h-[42px] px-2 rounded-[4px] text-[15px] font-medium',
                  active ? 'bg-active-a text-text-hi' : 'text-text-sub hover:bg-hover-a hover:text-text-mute',
                )}
              >
                <Icon size={20} />
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>
        <UserPanel />
      </aside>

      {/* Main */}
      <main className="flex-1 bg-bg overflow-y-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-brand to-mention px-10 pt-12 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-[40px] font-bold text-white leading-tight">Find your community on Discord</h1>
            <p className="text-white/80 text-[15px] mt-3 mb-6">
              From gaming and music to school and study help — there's a place for you.
            </p>
            <div className="relative max-w-md mx-auto">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Explore communities"
                className="w-full bg-rail rounded-md h-11 pl-4 pr-10 text-[15px] text-text-body placeholder:text-text-sub outline-none focus:ring-2 focus:ring-white/40"
              />
              <Search size={18} className="absolute right-3 top-3.5 text-text-sub" />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-hi font-bold text-[20px]">Most Popular</h2>
            <span className="text-text-sub text-[13px]">{filtered.length} communities</span>
          </div>

          {guilds.isLoading && <div className="text-text-sub">Loading…</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((g) => (
              <GuildCard key={g.id} g={g} onJoin={() => join(g)} />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}

function GuildCard({ g, onJoin }: { g: PublicGuild; onJoin: () => void }) {
  return (
    <div className="bg-panel rounded-lg overflow-hidden flex flex-col hover:translate-y-[-2px] transition-transform">
      <div className="h-[120px] bg-gradient-to-br from-brand to-mention relative">
        <img src="/server-banner.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute -bottom-7 left-4 w-14 h-14 rounded-xl bg-rail border-4 border-panel grid place-items-center text-white font-bold text-xl">
          {g.name[0]?.toUpperCase()}
        </div>
      </div>
      <div className="p-4 pt-9 flex-1 flex flex-col">
        <h3 className="text-text-hi font-bold text-[16px] truncate">{g.name}</h3>
        <p className="text-text-sub text-[13px] mt-1 line-clamp-2 flex-1">
          A community for {g.name.toLowerCase()} fans. Hang out, share, and chat in real time.
        </p>
        <div className="flex items-center gap-3 text-[12px] text-text-sub mt-3">
          <span className="flex items-center gap-1"><Users size={14} /> {g.memberCount}</span>
          <span className="flex items-center gap-1"><Hash size={14} /> {g.channelCount}</span>
          <span className="flex items-center gap-1"><Volume2 size={14} /></span>
        </div>
        <button
          onClick={onJoin}
          className="mt-3 h-9 bg-brand hover:bg-brand-hi text-white text-[14px] font-medium rounded transition-colors"
        >
          Join Server
        </button>
      </div>
    </div>
  )
}
