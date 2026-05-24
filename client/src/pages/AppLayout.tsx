import { useEffect, useState, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Phone, PhoneOff } from 'lucide-react'
import { sfx } from '../lib/sfx'
import GuildRail from '../layout/GuildRail'
import { useGuilds } from '../lib/queries'
import { getSocket } from '../lib/socket'
import SearchOverlay from '../features/search/SearchOverlay'
import JoinModal from '../features/invite/JoinModal'
import CreateServerModal from '../features/invite/CreateServerModal'
import { useVoiceRosterSync } from '../features/voice/useVoiceRosterSync'
import { useQueryClient } from '@tanstack/react-query'

type ModalState = { showSearch: boolean; showJoin: boolean }
type ModalCtxValue = ModalState & {
  setShowSearch: (b: boolean) => void
  setShowJoin: (b: boolean) => void
}

import { createContext, useContext } from 'react'
const ModalCtx = createContext<ModalCtxValue | null>(null)
export function useModals() {
  const v = useContext(ModalCtx)
  if (!v) throw new Error('ModalCtx missing')
  return v
}

export default function AppLayout() {
  const guilds = useGuilds()
  const loc = useLocation()
  const [showSearch, setShowSearch] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const qc = useQueryClient()
  const qcRef = useRef(qc)
  qcRef.current = qc
  const nav = useNavigate()
  const [incoming, setIncoming] = useState<{ channelId: string; from: { id: string; username: string } } | null>(null)
  const incomingTimer = useRef<number | null>(null)

  useVoiceRosterSync()

  // socket connect + presence sub
  useEffect(() => {
    const s = getSocket()
    function onPresence({ userId, status }: { userId: string; status: 'online' | 'idle' | 'dnd' | 'offline' }) {
      // patch ALL member-list caches that contain this user
      const all = (qcRef.current as unknown as { getQueriesData: (filt: { queryKey: unknown[] }) => [unknown[], unknown][] })
        .getQueriesData({ queryKey: ['members'] })
      all.forEach(([key, data]) => {
        if (!Array.isArray(data)) return
        ;(qcRef.current as unknown as { setQueryData: (k: unknown[], d: unknown) => void }).setQueryData(
          key,
          data.map((m: { id: string }) => (m.id === userId ? { ...m, status } : m)),
        )
      })
      // also patch /users list cache
      const users = (qcRef.current as unknown as { getQueryData: (k: unknown[]) => unknown }).getQueryData(['users'])
      if (Array.isArray(users)) {
        ;(qcRef.current as unknown as { setQueryData: (k: unknown[], d: unknown) => void }).setQueryData(
          ['users'],
          users.map((u: { id: string }) => (u.id === userId ? { ...u, status } : u)),
        )
      }
    }
    function onIncomingCall(p: { channelId: string; from: { id: string; username: string } }) {
      setIncoming(p)
      sfx.play('outgoing')
      if (incomingTimer.current) clearTimeout(incomingTimer.current)
      incomingTimer.current = window.setTimeout(() => setIncoming(null), 20000)
    }
    s.on('presence:update', onPresence)
    s.on('dm:incoming-call', onIncomingCall)
    return () => {
      s.off('presence:update', onPresence)
      s.off('dm:incoming-call', onIncomingCall)
      if (incomingTimer.current) clearTimeout(incomingTimer.current)
    }
  }, [])

  // ⌘K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (guilds.isLoading) {
    return <div className="h-screen grid place-items-center bg-bg text-text-sub">Loading…</div>
  }

  return (
    <ModalCtx.Provider value={{ showSearch, showJoin, setShowSearch, setShowJoin }}>
      <div className="h-screen flex bg-rail text-text-body" data-path={loc.pathname}>
        <GuildRail guilds={guilds.data || []} onJoinClick={() => setShowCreate(true)} />
        <Outlet />
        {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
        {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
        {showCreate && (
          <CreateServerModal
            onClose={() => setShowCreate(false)}
            onOpenJoin={() => setShowJoin(true)}
          />
        )}
        {incoming && (
          <div className="fixed bottom-6 right-6 z-50 w-80 bg-panel border border-divider/60 rounded-lg shadow-elev1 overflow-hidden">
            <div className="px-4 py-3 border-b border-divider/60">
              <div className="text-text-sub text-[11px] uppercase tracking-cap font-semibold">Incoming Call</div>
              <div className="text-text-hi text-[15px] font-semibold mt-0.5">{incoming.from.username}</div>
            </div>
            <div className="px-4 py-3 flex gap-2">
              <button
                onClick={() => {
                  nav(`/app/dm/${incoming.channelId}?call=1`)
                  setIncoming(null)
                }}
                className="flex-1 h-9 rounded bg-online hover:bg-online/90 text-white text-[14px] font-medium flex items-center justify-center gap-1.5"
              >
                <Phone size={16} /> Accept
              </button>
              <button
                onClick={() => setIncoming(null)}
                className="flex-1 h-9 rounded bg-danger hover:bg-err-bright text-white text-[14px] font-medium flex items-center justify-center gap-1.5"
              >
                <PhoneOff size={16} /> Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalCtx.Provider>
  )
}
