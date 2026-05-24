import { useEffect, useMemo, useRef } from 'react'
import MessageItem from './MessageItem'
import type { ChatMessage } from '../../lib/queries'

function sameDay(a: string, b: string) {
  const d1 = new Date(a), d2 = new Date(b)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function MessageList({
  messages,
  onEdit,
  onDelete,
  onTopReached,
  loadingMore,
}: {
  messages: ChatMessage[]
  onEdit: (id: string, content: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onTopReached: () => void
  loadingMore: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)
  const lastChannelRef = useRef<string | undefined>(undefined)

  // build groups with date separators
  const items = useMemo(() => {
    const out: ({ kind: 'date'; iso: string } | { kind: 'msg'; m: ChatMessage; hideHeader: boolean })[] = []
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      const prev = messages[i - 1]
      if (!prev || !sameDay(prev.createdAt, m.createdAt)) {
        out.push({ kind: 'date', iso: m.createdAt })
        out.push({ kind: 'msg', m, hideHeader: false })
      } else {
        const groupable =
          prev.author.id === m.author.id &&
          new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000
        out.push({ kind: 'msg', m, hideHeader: groupable })
      }
    }
    return out
  }, [messages])

  // autoscroll to bottom when channel changes or count grows from bottom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const channelId = messages[0]?.channelId
    const channelChanged = channelId !== lastChannelRef.current
    const grown = messages.length > lastCountRef.current
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (channelChanged || (grown && nearBottom)) {
      el.scrollTop = el.scrollHeight
    }
    lastCountRef.current = messages.length
    lastChannelRef.current = channelId
  }, [messages])

  // intersection on top sentinel triggers load more
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onTopReached()
      },
      { root: containerRef.current, threshold: 0 },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [onTopReached])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto py-4">
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && <div className="text-center text-xs text-text-sub py-2">loading…</div>}
      {!loadingMore && messages.length === 0 && (
        <div className="text-center text-text-sub py-8">No messages yet. Say hi!</div>
      )}
      {items.map((it, i) =>
        it.kind === 'date' ? (
          <div key={`d-${i}`} className="flex items-center gap-3 px-4 my-4">
            <div className="flex-1 h-px bg-divider/50" />
            <span className="text-[11px] font-semibold text-text-sub leading-[13px]">{fmtDate(it.iso)}</span>
            <div className="flex-1 h-px bg-divider/50" />
          </div>
        ) : (
          <MessageItem
            key={it.m.id}
            m={it.m}
            hideHeader={it.hideHeader}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      )}
    </div>
  )
}
