import { useEffect, useState, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import GuildRail from '../layout/GuildRail'
import { useGuilds } from '../lib/queries'
import { getSocket } from '../lib/socket'
import SearchOverlay from '../features/search/SearchOverlay'
import JoinModal from '../features/invite/JoinModal'
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

  const qc = useQueryClient()
  const qcRef = useRef(qc)
  qcRef.current = qc

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
    s.on('presence:update', onPresence)
    return () => { s.off('presence:update', onPresence) }
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
        <GuildRail guilds={guilds.data || []} onJoinClick={() => setShowJoin(true)} />
        <Outlet />
        {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
        {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
      </div>
    </ModalCtx.Provider>
  )
}
