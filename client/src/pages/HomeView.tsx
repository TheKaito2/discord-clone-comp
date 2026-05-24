import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, UserCheck, UserPlus, MessageCircle, MoreVertical, Inbox, HelpCircle, Search } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import UserPanel from '../layout/UserPanel'

type FriendUser = {
  id: string
  username: string
  avatarColor: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  lastSeenAt: string
}

const TABS = ['Online', 'All', 'Pending', 'Blocked'] as const

export default function HomeView() {
  const me = useAuthStore((s) => s.user)
  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<FriendUser[]>('/users')).data,
  })
  const [tab, setTab] = useState<(typeof TABS)[number]>('Online')

  const friends = (users.data || []).filter((u) => u.id !== me?.id)
  const online = friends.filter((u) => u.status !== 'offline')
  const list = tab === 'Online' ? online : tab === 'All' ? friends : []

  return (
    <>
      {/* Sidebar — d17 style: search + Friends button + Nitro + Direct Messages */}
      <aside className="w-sidebar bg-panel shrink-0 h-full flex flex-col">
        <header className="h-12 px-2 flex items-center border-b border-rail/60 shadow-elev1 shrink-0">
          <button className="w-full text-left bg-rail rounded-[4px] px-2 h-7 text-text-sub text-[13px] hover:text-text-mute">
            Find or start a conversation
          </button>
        </header>
        <div className="flex-1 overflow-y-auto py-2">
          <button className="mx-2 flex items-center gap-3 w-[calc(100%-1rem)] h-[42px] px-2 rounded-[4px] bg-active-a text-text-hi">
            <Users size={20} />
            <span className="text-[15px] font-medium">Friends</span>
          </button>
          <button className="mx-2 mt-0.5 flex items-center gap-3 w-[calc(100%-1rem)] h-[42px] px-2 rounded-[4px] text-text-sub hover:bg-hover-a hover:text-text-mute">
            <Inbox size={20} />
            <span className="text-[15px] font-medium">Inbox</span>
          </button>

          <div className="flex items-center justify-between mt-4 px-3 mb-1">
            <span className="uppercase tracking-cap text-[12px] font-semibold text-text-sub">Direct Messages</span>
            <UserPlus size={16} className="text-text-sub hover:text-text-hi cursor-pointer" />
          </div>
          {friends.slice(0, 6).map((u) => (
            <button
              key={u.id}
              className="mx-2 mt-0.5 flex items-center gap-3 w-[calc(100%-1rem)] h-[42px] px-2 rounded-[4px] text-text-sub hover:bg-hover-a hover:text-text-mute group"
            >
              <div className="relative shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ background: u.avatarColor }}
                >
                  {u.username[0].toUpperCase()}
                </div>
                <span
                  className={clsx(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-panel',
                    u.status === 'online' && 'bg-online',
                    u.status === 'idle' && 'bg-idle',
                    u.status === 'dnd' && 'bg-dnd',
                    u.status === 'offline' && 'bg-offline',
                  )}
                />
              </div>
              <span className="text-[15px] truncate text-left flex-1">{u.username}</span>
            </button>
          ))}
        </div>
        <UserPanel />
      </aside>

      {/* Main — d17 Friends content */}
      <main className="flex-1 bg-bg flex flex-col min-w-0">
        <header className="h-12 px-4 flex items-center border-b border-rail/60 shadow-elev1 gap-4 text-[15px]">
          <span className="flex items-center gap-2 text-text-mute font-semibold">
            <Users size={20} className="text-text-dim" /> Friends
          </span>
          <span className="w-px h-5 bg-divider/60" />
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-2 py-0.5 rounded transition-colors',
                tab === t
                  ? 'text-text-hi bg-hover-a'
                  : 'text-text-sub hover:text-text-hi',
              )}
            >
              {t}
              {t === 'Online' && online.length > 0 && tab !== 'Online' && (
                <span className="ml-1 text-text-sub">— {online.length}</span>
              )}
            </button>
          ))}
          <button className="px-3 py-0.5 rounded bg-success text-white text-[14px] font-medium hover:bg-online/90">
            Add Friend
          </button>
          <div className="ml-auto flex items-center gap-3 text-text-sub">
            <button className="p-1 hover:text-text-hi" title="Active Now">
              <UserCheck size={18} />
            </button>
            <button className="p-1 hover:text-text-hi" title="Help">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pt-6">
          {/* Search bar */}
          <div className="relative mb-6 max-w-2xl">
            <input
              placeholder="Search"
              className="w-full bg-rail rounded h-7 px-3 pr-9 text-[13px] text-text-body placeholder:text-text-sub outline-none focus:ring-1 focus:ring-brand"
            />
            <Search size={16} className="absolute right-2 top-1.5 text-text-sub" />
          </div>

          <h2 className="uppercase tracking-cap text-[12px] font-bold text-text-mute mb-4">
            {tab} — {list.length}
          </h2>

          {list.length === 0 && (
            <EmptyFriends tab={tab} />
          )}

          <div className="flex flex-col">
            {list.map((u) => (
              <FriendRow key={u.id} u={u} />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}

function FriendRow({ u }: { u: FriendUser }) {
  return (
    <div className="group flex items-center gap-3 h-[60px] px-2 mx-[-8px] border-t border-divider/40 hover:bg-hover-a/30 hover:border-transparent rounded transition-colors cursor-pointer">
      <div className="relative shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
          style={{ background: u.avatarColor }}
        >
          {u.username[0].toUpperCase()}
        </div>
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
      <button className="opacity-0 group-hover:opacity-100 h-9 w-9 grid place-items-center rounded-full bg-rail text-text-mute hover:text-text-hi" title="Message">
        <MessageCircle size={18} />
      </button>
      <button className="opacity-0 group-hover:opacity-100 h-9 w-9 grid place-items-center rounded-full bg-rail text-text-mute hover:text-text-hi" title="More">
        <MoreVertical size={18} />
      </button>
    </div>
  )
}

function EmptyFriends({ tab }: { tab: string }) {
  return (
    <div className="grid place-items-center py-16 text-center text-text-sub">
      <Users size={64} className="text-divider mb-4" />
      <p className="text-[15px]">{tab === 'Pending' ? 'There are no pending friend requests. Here\'s some tumbleweed.' : 'No friends here yet.'}</p>
    </div>
  )
}
