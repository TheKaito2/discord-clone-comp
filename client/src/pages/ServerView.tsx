import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Hash, Volume2, Users, Search } from 'lucide-react'
import clsx from 'clsx'
import ChannelSidebar from '../layout/ChannelSidebar'
import MemberList from '../layout/MemberList'
import UserPanel from '../layout/UserPanel'
import MessageList from '../features/chat/MessageList'
import Composer from '../features/chat/Composer'
import { useChannelChat } from '../features/chat/useChat'
import { useGuilds, useMembers, useMessages, type ChatMessage } from '../lib/queries'
import VoicePanel from '../features/voice/VoicePanel'
import { useModals } from './AppLayout'

export default function ServerView() {
  const { guildId, channelId } = useParams()
  const nav = useNavigate()
  // default members panel ON above lg (1024px), OFF below
  const [showMembers, setShowMembers] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  )
  const { setShowSearch } = useModals()

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    function handle(e: MediaQueryListEvent) { setShowMembers(e.matches) }
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  const guilds = useGuilds()
  const members = useMembers(guildId)
  const messages = useMessages(channelId)
  const chat = useChannelChat(channelId)

  useEffect(() => {
    if (!guilds.data || !guildId) return
    if (!channelId) {
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

  return (
    <>
      {guild ? (
        <div className="w-sidebar shrink-0 h-full flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <ChannelSidebar guild={guild} />
          </div>
          <UserPanel />
        </div>
      ) : (
        <div className="w-sidebar shrink-0 h-full bg-panel flex flex-col">
          <div className="flex-1 grid place-items-center text-text-sub text-sm p-4">
            Server not found
          </div>
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
              <span className="font-semibold text-[16px] text-text-hi leading-5">{channel.name}</span>
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
          <div className="ml-auto flex items-center gap-1 text-text-sub">
            <button
              onClick={() => setShowSearch(true)}
              className="px-2 h-7 inline-flex items-center gap-1.5 rounded text-[12px] font-medium bg-rail/60 hover:bg-rail border border-divider/40 hover:text-text-hi transition-colors"
              title="Search (⌘K)"
            >
              <Search size={14} />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden md:inline text-[10px] font-bold bg-bg/70 border border-divider/40 rounded px-1 ml-0.5 text-text-meta">⌘K</kbd>
            </button>
            <button
              onClick={() => setShowMembers((v) => !v)}
              className={clsx(
                'p-1.5 rounded hover:bg-hover-a/50 transition-colors',
                showMembers ? 'text-text-hi' : 'hover:text-text-hi',
              )}
              title="Members"
            >
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
    </>
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
