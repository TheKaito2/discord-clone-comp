import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, MessageCircle, MoreVertical, HelpCircle, Search, X, Phone } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { DM } from '../lib/queries'
import Avatar from '../components/Avatar'
import DMSidebar from '../layout/DMSidebar'

type FriendUser = {
  id: string
  username: string
  avatarColor: string
  avatarUrl?: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  lastSeenAt: string
}

const TABS = ['Online', 'All', 'Pending', 'Blocked'] as const

export default function HomeView() {
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const nav = useNavigate()
  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<FriendUser[]>('/users')).data,
  })
  const [tab, setTab] = useState<(typeof TABS)[number]>('Online')
  const [search, setSearch] = useState('')
  const [addFriend, setAddFriend] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  async function openDM(userId: string, startCall = false) {
    try {
      const { data } = await api.post<DM>('/dms', { userId })
      qc.invalidateQueries({ queryKey: ['dms'] })
      nav(`/app/dm/${data.id}${startCall ? '?call=1' : ''}`)
    } catch {
      flash('Could not open DM')
    }
  }

  const friends = (users.data || []).filter((u) => u.id !== me?.id)
  const online = friends.filter((u) => u.status !== 'offline')
  const base = tab === 'Online' ? online : tab === 'All' ? friends : []
  const filtered = base.filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <>
      <DMSidebar />

      {/* Main */}
      <main className="flex-1 bg-bg flex flex-col min-w-0">
        <header className="h-12 px-4 flex items-center border-b border-rail/60 shadow-elev1 gap-4 text-[15px]">
          <span className="flex items-center gap-2 text-text-mute font-semibold">
            <Users size={20} className="text-text-dim" /> Friends
          </span>
          <span className="w-px h-5 bg-divider/60" />
          {TABS.map((t) => {
            const count = t === 'Online' ? online.length : t === 'All' ? friends.length : 0
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  'px-2.5 h-7 rounded inline-flex items-center gap-1.5 transition-all',
                  active
                    ? 'text-text-hi bg-hover-a'
                    : 'text-text-sub hover:text-text-hi hover:bg-hover-a/40',
                )}
              >
                <span>{t}</span>
                {count > 0 && (t === 'Online' || t === 'All') && (
                  <span className={clsx(
                    'text-[11px] font-bold leading-4 px-1.5 rounded-full',
                    active ? 'bg-brand/30 text-text-hi' : 'bg-rail text-text-sub',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={() => setAddFriend(true)}
            className="px-3 h-7 rounded bg-online text-white text-[14px] font-medium hover:bg-online/90 transition-all hover:shadow-glow-online"
          >
            Add Friend
          </button>
          <div className="ml-auto flex items-center gap-3 text-text-sub">
            <button
              onClick={() => flash(`${online.length} friends active right now`)}
              className="p-1 hover:text-text-hi"
              title="Active Now"
            >
              <UserCheck size={18} />
            </button>
            <button
              onClick={() => flash('Hover a friend row to message or call')}
              className="p-1 hover:text-text-hi"
              title="Help"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pt-6 pb-10">
          {/* Hero strip — only when there's content & it's the Online tab */}
          {tab === 'Online' && online.length > 0 && !search && (
            <div className="mb-6 relative overflow-hidden rounded-xl border border-divider/40 bg-gradient-to-br from-brand/20 via-panel to-mention/15 p-5 anim-slide-up">
              <div aria-hidden className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-online/20 text-online grid place-items-center shadow-glow-online">
                  <UserCheck size={22} />
                </div>
                <div>
                  <div className="text-text-hi font-bold text-[17px] tracking-tight">
                    {online.length === 1 ? '1 friend is around' : `${online.length} friends are around`}
                  </div>
                  <div className="text-text-mute text-[13px]">Say hi — they&rsquo;re probably bored.</div>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-6 max-w-2xl">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-rail rounded h-8 px-3 pr-9 text-[13.5px] leading-5 text-text-body placeholder:text-text-sub outline-none focus:ring-1 focus:ring-brand transition-shadow focus:shadow-[0_0_0_3px_rgba(88,101,242,0.18)]"
            />
            <Search size={16} className="absolute right-2.5 top-2 text-text-sub" />
          </div>

          <h2 className="uppercase tracking-cap text-[12px] font-bold text-text-mute leading-4 mb-4">
            {tab} — {filtered.length}
          </h2>

          {filtered.length === 0 && (
            <EmptyFriends tab={tab} hasSearch={search.length > 0} />
          )}

          <div className="flex flex-col">
            {filtered.map((u) => (
              <FriendRow
                key={u.id}
                u={u}
                onMessage={() => openDM(u.id)}
                onCall={() => openDM(u.id, true)}
                onMore={() => flash(`More actions for ${u.username}`)}
              />
            ))}
          </div>
        </div>
      </main>

      {addFriend && <AddFriendModal onClose={() => setAddFriend(false)} onResult={flash} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-panel border border-divider/60 text-text-hi text-[14px] px-4 py-2.5 rounded-lg shadow-elev2 z-50 anim-slide-up flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-online anim-pulse-ring" />
          {toast}
        </div>
      )}
    </>
  )
}

function FriendRow({
  u,
  onMessage,
  onCall,
  onMore,
}: {
  u: FriendUser
  onMessage: () => void
  onCall: () => void
  onMore: () => void
}) {
  return (
    <div
      onClick={onMessage}
      className="group flex items-center gap-3 h-[60px] px-2 mx-[-8px] border-t border-divider/40 hover:bg-hover-a/30 hover:border-transparent rounded transition-all cursor-pointer hover:translate-x-0.5"
    >
      <div className="relative shrink-0">
        <Avatar username={u.username} avatarColor={u.avatarColor} avatarUrl={u.avatarUrl} size={32} />
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-bg',
            u.status === 'online' && 'bg-online',
            u.status === 'idle' && 'bg-idle',
            u.status === 'dnd' && 'bg-dnd',
            u.status === 'offline' && 'bg-offline',
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-text-hi truncate">{u.username}</div>
        <div className="text-[12px] text-text-sub truncate">
          {u.status === 'online' && 'Online'}
          {u.status === 'idle' && 'Idle'}
          {u.status === 'dnd' && 'Do Not Disturb'}
          {u.status === 'offline' && 'Offline'}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onMessage() }}
        className="opacity-0 group-hover:opacity-100 h-9 w-9 grid place-items-center rounded-full bg-rail text-text-mute hover:text-text-hi"
        title="Message"
      >
        <MessageCircle size={18} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onCall() }}
        className="opacity-0 group-hover:opacity-100 h-9 w-9 grid place-items-center rounded-full bg-rail text-text-mute hover:text-online"
        title="Voice call"
      >
        <Phone size={18} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMore() }}
        className="opacity-0 group-hover:opacity-100 h-9 w-9 grid place-items-center rounded-full bg-rail text-text-mute hover:text-text-hi"
        title="More"
      >
        <MoreVertical size={18} />
      </button>
    </div>
  )
}

function EmptyFriends({ tab, hasSearch }: { tab: string; hasSearch: boolean }) {
  const copy = hasSearch
    ? { title: 'No matches', sub: 'Try a different name.' }
    : tab === 'Pending'
      ? { title: 'No pending requests', sub: 'When someone sends you a friend request, it&apos;ll show up here.' }
      : tab === 'Blocked'
        ? { title: 'No blocked users', sub: 'You haven&apos;t blocked anyone — keep it that way.' }
        : tab === 'Online'
          ? { title: 'No one is around', sub: 'When friends come online, they&apos;ll appear right here.' }
          : { title: 'Wumpus is lonely', sub: 'Add a friend to start a conversation.' }
  return (
    <div className="grid place-items-center py-16 text-center anim-fade-in">
      <div className="relative w-[140px] h-[140px] mb-5 grid place-items-center">
        <div className="absolute inset-0 rounded-full bg-brand/8 blur-2xl" />
        <div className="relative w-[110px] h-[110px] rounded-full bg-rail border border-divider/40 grid place-items-center anim-float">
          <Users size={56} className="text-text-meta" />
        </div>
      </div>
      <p className="text-text-mute text-[16px] font-semibold" dangerouslySetInnerHTML={{ __html: copy.title }} />
      <p className="text-text-sub text-[13.5px] mt-1 max-w-sm" dangerouslySetInnerHTML={{ __html: copy.sub }} />
    </div>
  )
}

function AddFriendModal({ onClose, onResult }: { onClose: () => void; onResult: (msg: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center anim-fade-in" onClick={onClose}>
      <div className="glass-panel rounded-xl w-[460px] p-6 relative anim-scale-in shadow-elev2" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-text-sub hover:text-text-hi" title="Close">
          <X size={18} />
        </button>
        <h3 className="text-[20px] font-bold text-text-hi mb-1">Add Friend</h3>
        <p className="text-[14px] text-text-mute mb-4">You can add friends with their Discord username.</p>
        <div className="flex items-center gap-2 bg-rail rounded p-1.5">
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="You can add friends with their Discord username."
            className="flex-1 bg-transparent px-2 h-9 text-[15px] text-text-body placeholder:text-text-sub outline-none"
          />
          <button
            disabled={!val.trim()}
            onClick={() => {
              onResult(`Friend request sent to ${val.trim()}`)
              onClose()
            }}
            className="bg-brand hover:bg-brand-hi disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium px-4 h-9 rounded leading-4"
          >
            Send Friend Request
          </button>
        </div>
      </div>
    </div>
  )
}
