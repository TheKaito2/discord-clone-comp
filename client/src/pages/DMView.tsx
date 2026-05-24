import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Phone, Video, Pin, UserPlus, Search, Inbox, HelpCircle, X } from 'lucide-react'
import clsx from 'clsx'
import { useDMs, useMessages } from '../lib/queries'
import { useChannelChat } from '../features/chat/useChat'
import MessageList from '../features/chat/MessageList'
import Composer from '../features/chat/Composer'
import VoicePanel from '../features/voice/VoicePanel'
import Avatar from '../components/Avatar'
import DMSidebar from '../layout/DMSidebar'

export default function DMView() {
  const { channelId } = useParams()
  const dms = useDMs()
  const qc = useQueryClient()

  const current = (dms.data || []).find((d) => d.id === channelId) || null

  const messages = useMessages(channelId)
  const chat = useChannelChat(channelId)
  const [inCall, setInCall] = useState(false)
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    if (!channelId) return
    qc.invalidateQueries({ queryKey: ['dms'] })
  }, [channelId, qc])

  useEffect(() => {
    if (params.get('call') === '1') {
      setInCall(true)
      params.delete('call')
      setParams(params, { replace: true })
    } else {
      setInCall(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  const headerTitle = useMemo(() => {
    if (!current) return 'Direct Message'
    return current.other.displayName || current.other.username
  }, [current])

  if (!channelId) {
    return (
      <>
        <DMSidebar />
        <main className="flex-1 grid place-items-center bg-bg text-text-sub">
          Select a conversation
        </main>
      </>
    )
  }

  return (
    <>
      <DMSidebar />

      <main className="flex-1 bg-bg flex flex-col min-w-0">
        <header className="h-12 border-b border-rail/60 flex items-center px-3 shadow-elev1 gap-2 shrink-0">
          {current ? (
            <>
              <div className="relative shrink-0">
                <Avatar
                  username={current.other.username}
                  avatarColor={current.other.avatarColor}
                  avatarUrl={current.other.avatarUrl}
                  size={24}
                />
                <span
                  className={clsx(
                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-bg',
                    current.other.status === 'online' && 'bg-online',
                    current.other.status === 'idle' && 'bg-idle',
                    current.other.status === 'dnd' && 'bg-dnd',
                    current.other.status === 'offline' && 'bg-offline',
                  )}
                />
              </div>
              <span className="font-semibold text-[16px] text-text-hi leading-5">{headerTitle}</span>
              <span className="w-px h-4 bg-divider/60 mx-1" />
              <span className="text-text-mute text-[13px]">
                {current.other.status === 'online' ? 'Active now' : current.other.status === 'offline' ? 'Offline' : 'Away'}
              </span>
            </>
          ) : (
            <span className="text-text-sub">Loading…</span>
          )}
          <div className="ml-auto flex items-center gap-3 text-text-sub">
            <button
              onClick={() => setInCall((v) => !v)}
              className={clsx('p-1 hover:text-text-hi', inCall && 'text-online')}
              title={inCall ? 'End call' : 'Start voice call'}
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => setInCall(true)}
              className="p-1 hover:text-text-hi"
              title="Start video call"
            >
              <Video size={20} />
            </button>
            <button className="p-1 hover:text-text-hi" title="Pinned messages">
              <Pin size={18} />
            </button>
            <button className="p-1 hover:text-text-hi" title="Add friends">
              <UserPlus size={18} />
            </button>
            <button className="p-1 hover:text-text-hi" title="Search">
              <Search size={18} />
            </button>
            <button className="p-1 hover:text-text-hi" title="Inbox">
              <Inbox size={18} />
            </button>
            <button className="p-1 hover:text-text-hi" title="Help">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Voice panel overlay on top half when in call */}
        {inCall && current && (
          <div className="shrink-0 border-b border-rail/60 relative" style={{ height: '50%', minHeight: 320 }}>
            <VoicePanel channelId={channelId} channelName={current.other.username} />
            <button
              onClick={() => setInCall(false)}
              className="absolute top-2 right-2 text-text-sub hover:text-text-hi bg-rail/70 rounded p-1 z-10"
              title="Hide call (stays connected)"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col">
          <MessageList
            messages={messages.data || []}
            onEdit={chat.edit}
            onDelete={chat.remove}
            onTopReached={() => {
              const oldest = (messages.data || [])[0]?.createdAt
              chat.loadMore(oldest)
            }}
            loadingMore={messages.isLoading || chat.loadingMore}
          />
          <Composer
            channelName={current?.other.username || 'this user'}
            onSend={chat.send}
          />
        </div>
      </main>
    </>
  )
}

