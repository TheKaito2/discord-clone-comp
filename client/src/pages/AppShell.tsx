import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Hash, Volume2, Users, Search } from 'lucide-react'
import GuildRail from '../layout/GuildRail'
import ChannelSidebar from '../layout/ChannelSidebar'
import MemberList from '../layout/MemberList'
import UserPanel from '../layout/UserPanel'
import MessageList from '../features/chat/MessageList'
import Composer from '../features/chat/Composer'
import { useChannelChat } from '../features/chat/useChat'
import { useGuilds, useMembers, useMessages, type ChatMessage } from '../lib/queries'
import { getSocket } from '../lib/socket'
import SearchOverlay from '../features/search/SearchOverlay'
import JoinModal from '../features/invite/JoinModal'
import VoicePanel from '../features/voice/VoicePanel'
import { useVoiceRosterSync } from '../features/voice/useVoiceRosterSync'
import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

export default function AppShell() {
  const { guildId, channelId } = useParams()
  const nav = useNavigate()
  const [showMembers, setShowMembers] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const guilds = useGuilds()
  const members = useMembers(guildId)
  const messages = useMessages(channelId)
  const chat = useChannelChat(channelId)
  const qc = useQueryClient()
  const qcRef = useRef(qc)
  qcRef.current = qc

  // subscribe to voice:roster broadcasts to keep sidebar in sync
  useVoiceRosterSync()

  // ensure socket connects with token on mount + listen to presence updates
  useEffect(() => {
    const s = getSocket()
    function onPresence({ userId, status }: { userId: string; status: 'online' | 'idle' | 'dnd' | 'offline' }) {
      // update any cached members list for current guild
      if (guildId) {
        const key = ['members', guildId]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cur = (qcRef.current as any)?.getQueryData?.(key)
        if (Array.isArray(cur)) {
          ;(qcRef.current as any).setQueryData(key, cur.map((m: any) => (m.id === userId ? { ...m, status } : m)))
        }
      }
    }
    s.on('presence:update', onPresence)
    return () => { s.off('presence:update', onPresence) }
  }, [guildId])

  // ⌘K / Ctrl+K toggles search
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

  // pick first guild/channel automatically if none chosen
  useEffect(() => {
    if (!guilds.data || guilds.data.length === 0) return
    if (!guildId) {
      const first = guilds.data[0]
      const ch = first.channels.find((c) => c.type === 'text') || first.channels[0]
      if (ch) nav(`/app/${first.id}/${ch.id}`, { replace: true })
      else nav(`/app/${first.id}`, { replace: true })
    } else if (!channelId) {
      const g = guilds.data.find((x) => x.id === guildId)
      const ch = g?.channels.find((c) => c.type === 'text') || g?.channels[0]
      if (ch) nav(`/app/${guildId}/${ch.id}`, { replace: true })
    }
  }, [guilds.data, guildId, channelId, nav])

  const guild = useMemo(
    () => guilds.data?.find((g) => g.id === guildId),
    [guilds.data, guildId],
  )
  const channel = useMemo(
    () => guild?.channels.find((c) => c.id === channelId),
    [guild, channelId],
  )

  if (guilds.isLoading) {
    return <div className="h-screen grid place-items-center bg-bg text-text-sub">Loading…</div>
  }

  return (
    <div className="h-screen flex bg-rail text-text-body">
      <GuildRail guilds={guilds.data || []} onJoinClick={() => setShowJoin(true)} />

      {guild ? (
        <div className="w-sidebar shrink-0 h-full flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <ChannelSidebar guild={guild} />
          </div>
          <UserPanel />
        </div>
      ) : (
        <div className="w-sidebar shrink-0 h-full bg-panel flex flex-col">
          <div className="flex-1" />
          <UserPanel />
        </div>
      )}

      <main className="flex-1 bg-bg flex flex-col min-w-0">
        <header className="h-12 border-b border-rail/60 flex items-center px-2 shadow-elev1 gap-2">
          {channel ? (
            <>
              {channel.type === 'voice' ? (
                <Volume2 size={24} className="text-text-dim shrink-0" />
              ) : (
                <Hash size={24} className="text-text-dim shrink-0" />
              )}
              <span className="font-semibold text-[15px] text-text-hi leading-5">{channel.name}</span>
              {channel.topic && (
                <>
                  <span className="w-px h-4 bg-divider/60 mx-1" />
                  <span className="text-text-mute text-[13px] truncate">{channel.topic}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-text-sub">Select a channel</span>
          )}
          <div className="ml-auto flex items-center gap-3 text-text-sub">
            <button onClick={() => setShowSearch(true)} className="p-1 hover:text-text-hi" title="Search (⌘K)">
              <Search size={18} />
            </button>
            <button onClick={() => setShowMembers((v) => !v)} className="p-1 hover:text-text-hi" title="Members">
              <Users size={18} />
            </button>
          </div>
        </header>

        {channel?.type === 'voice' ? (
          <VoicePanel channelId={channel.id} channelName={channel.name} />
        ) : channel ? (
          <ChatArea
            channelName={channel.name}
            messages={messages.data || []}
            loading={messages.isLoading || chat.loadingMore}
            chat={chat}
          />
        ) : (
          <div className="flex-1 grid place-items-center text-text-sub">No channel selected</div>
        )}
      </main>

      {showMembers && guild && <MemberList members={members.data || []} />}

      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
    </div>
  )
}

function ChatArea({
  channelName,
  messages,
  loading,
  chat,
}: {
  channelName: string
  messages: ChatMessage[]
  loading: boolean
  chat: ReturnType<typeof useChannelChat>
}) {
  return (
    <>
      <MessageList
        messages={messages}
        onEdit={chat.edit}
        onDelete={chat.remove}
        onTopReached={() => {
          const oldest = messages[0]?.createdAt
          chat.loadMore(oldest)
        }}
        loadingMore={loading}
      />
      <Composer channelName={channelName} onSend={chat.send} />
    </>
  )
}

