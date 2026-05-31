import { useState } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { Users, Inbox, X, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import { useDMs } from '../lib/queries'
import { api } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'
import UserPanel from './UserPanel'
import Avatar from '../components/Avatar'

export default function DMSidebar() {
  const dms = useDMs()
  const matchHome = useMatch('/app/home')
  const matchDM = useMatch('/app/dm/:channelId')
  const activeId = matchDM?.params?.channelId
  const nav = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')

  async function closeDM(id: string) {
    await api.delete(`/dms/${id}`)
    qc.invalidateQueries({ queryKey: ['dms'] })
    if (activeId === id) nav('/app/home')
  }

  const list = (dms.data || []).filter((d) =>
    d.other.username.toLowerCase().includes(filter.trim().toLowerCase()),
  )

  return (
    <aside className="w-sidebar bg-panel shrink-0 h-full flex flex-col">
      <header className="h-12 px-2 flex items-center border-b border-rail/60 shadow-elev1 shrink-0">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find or start a conversation"
          className="w-full bg-rail rounded-[4px] px-2 h-7 text-text-body text-[13px] placeholder:text-text-sub outline-none focus:ring-1 focus:ring-brand"
        />
      </header>
      <div className="flex-1 overflow-y-auto py-2">
        <Link
          to="/app/home"
          className={clsx(
            'mx-2 flex items-center gap-3 w-[calc(100%-1rem)] h-[42px] px-2 rounded-[4px]',
            matchHome ? 'bg-active-a text-text-hi' : 'text-text-sub hover:bg-hover-a hover:text-text-mute',
          )}
        >
          <Users size={20} />
          <span className="text-[15px] font-medium">Friends</span>
        </Link>
        <button
          className="mx-2 mt-0.5 flex items-center gap-3 w-[calc(100%-1rem)] h-[42px] px-2 rounded-[4px] text-text-sub hover:bg-hover-a hover:text-text-mute"
        >
          <Inbox size={20} />
          <span className="text-[15px] font-medium">Inbox</span>
        </button>

        <div className="flex items-center justify-between mt-4 px-3 mb-1">
          <span className="uppercase tracking-cap text-[12px] font-semibold text-text-sub leading-4">
            Direct Messages
          </span>
        </div>
        {list.length === 0 && (
          <div className="px-4 py-6 text-center text-text-sub text-[13px]">
            No DMs yet.
            <br />
            Open Friends → message someone.
          </div>
        )}
        {list.map((d) => {
          const active = activeId === d.id
          return (
            <div
              key={d.id}
              className={clsx(
                'group mx-2 mt-0.5 relative rounded-[4px]',
                active ? 'bg-active-a' : 'hover:bg-hover-a',
              )}
            >
              <Link
                to={`/app/dm/${d.id}`}
                className={clsx(
                  'flex items-center gap-3 h-[42px] px-2 rounded-[4px] w-full transition-colors',
                  active ? 'text-text-hi' : 'text-text-sub hover:text-text-mute',
                )}
              >
                <div className="relative shrink-0">
                  <Avatar
                    username={d.other.username}
                    avatarColor={d.other.avatarColor}
                    avatarUrl={d.other.avatarUrl}
                    size={32}
                  />
                  <span
                    className={clsx(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-panel',
                      d.other.status === 'online' && 'bg-online',
                      d.other.status === 'idle' && 'bg-idle',
                      d.other.status === 'dnd' && 'bg-dnd',
                      d.other.status === 'offline' && 'bg-offline',
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] truncate text-left leading-tight">
                    {d.other.displayName || d.other.username}
                  </div>
                  <div className="text-[12px] text-text-sub truncate leading-tight">
                    {d.other.status === 'online' ? (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle size={11} /> Active now
                      </span>
                    ) : (
                      d.other.username
                    )}
                  </div>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  closeDM(d.id)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-text-sub hover:text-text-hi hover:bg-rail/60"
                title="Close DM"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <UserPanel />
    </aside>
  )
}
