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
        <div className="relative overflow-hidden px-10 pt-14 pb-20" style={{
          background:
            'radial-gradient(900px 500px at 12% 20%, rgba(88,101,242,0.65) 0%, transparent 60%), radial-gradient(700px 480px at 100% 110%, rgba(235,69,158,0.45) 0%, transparent 60%), linear-gradient(135deg, #4752C4 0%, #5865F2 45%, #9139FF 100%)',
        }}>
          <div aria-hidden className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
          <div
            aria-hidden
            className="absolute -top-20 left-1/4 w-[360px] h-[360px] rounded-full blur-3xl opacity-50 anim-float"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent 60%)' }}
          />
          <div className="relative max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-cap text-white/85 bg-white/10 border border-white/20 backdrop-blur px-3 py-1 rounded-full mb-4">
              <Sparkles size={12} /> Discover
            </span>
            <h1 className="text-[44px] font-bold text-white leading-tight tracking-tight text-shadow-glow">
              Find your community on Discord
            </h1>
            <p className="text-white/85 text-[15px] mt-3 mb-7 max-w-xl mx-auto">
              From gaming and music to school and study help — there&rsquo;s a place for you.
            </p>
            <div className="relative max-w-lg mx-auto">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Explore communities"
                className="w-full bg-white/95 rounded-xl h-12 pl-5 pr-12 text-[15px] text-rail placeholder:text-text-sub outline-none focus:ring-4 focus:ring-white/40 shadow-elev2"
              />
              <Search size={18} className="absolute right-4 top-[17px] text-text-sub" />
            </div>
            <div className="flex items-center justify-center gap-6 text-white/80 text-[13px] mt-5">
              <span>Trending now</span>
              <span className="opacity-50">•</span>
              <span className="font-semibold text-white">{(guilds.data || []).length} live communities</span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-8 py-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-text-hi font-bold text-[22px] tracking-tight">Most Popular</h2>
              <p className="text-text-sub text-[13px] mt-0.5">Top servers across all categories</p>
            </div>
            <span className="text-text-sub text-[13px]">{filtered.length} communities</span>
          </div>

          {guilds.isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-panel rounded-xl overflow-hidden">
                  <div className="h-[120px] skeleton" />
                  <div className="p-4 pt-9 space-y-2">
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                    <div className="skeleton h-9 w-full rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!guilds.isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-text-sub">
              <Compass size={48} className="mx-auto mb-3 text-text-meta" />
              <p className="text-[15px] text-text-mute font-medium">No communities match &ldquo;{q}&rdquo;</p>
              <p className="text-[13px] mt-1">Try a different keyword.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((g, i) => (
              <div key={g.id} className="anim-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <GuildCard g={g} onJoin={() => join(g)} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}

function GuildCard({ g, onJoin }: { g: PublicGuild; onJoin: () => void }) {
  return (
    <div className="group bg-panel rounded-xl overflow-hidden flex flex-col transition-all duration-300 ease-snappy hover:-translate-y-1 hover:shadow-card hover:ring-1 hover:ring-brand/30">
      <div className="h-[120px] bg-gradient-to-br from-brand to-mention relative overflow-hidden">
        <img
          src="/server-banner.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-panel/40 via-transparent to-transparent" />
        <div className="absolute -bottom-7 left-4 w-14 h-14 rounded-2xl bg-rail border-4 border-panel grid place-items-center text-white font-bold text-xl shadow-elev1">
          {g.name[0]?.toUpperCase()}
        </div>
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-cap bg-black/55 backdrop-blur text-white px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-online animate-pulse-soft" /> Featured
        </span>
      </div>
      <div className="p-4 pt-9 flex-1 flex flex-col">
        <h3 className="text-text-hi font-bold text-[16px] truncate group-hover:text-brand transition-colors">{g.name}</h3>
        <p className="text-text-sub text-[13px] mt-1 line-clamp-2 flex-1">
          A community for {g.name.toLowerCase()} fans. Hang out, share, and chat in real time.
        </p>
        <div className="flex items-center gap-3 text-[12px] text-text-sub mt-3">
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-online" /> {g.memberCount} online</span>
          <span className="inline-flex items-center gap-1"><Hash size={12} /> {g.channelCount}</span>
          <span className="inline-flex items-center gap-1"><Volume2 size={12} /></span>
        </div>
        <button
          onClick={onJoin}
          className="mt-3 h-9 btn-primary text-[14px]"
        >
          Join Server
        </button>
      </div>
    </div>
  )
}
