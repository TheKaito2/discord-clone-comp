import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../../lib/socket'
import { api } from '../../lib/api'
import type { ChatMessage } from '../../lib/queries'

export function useChannelChat(channelId: string | undefined) {
  const qc = useQueryClient()
  const [extra, setExtra] = useState<ChatMessage[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!channelId) return
    setExtra([])
    setHasMore(true)
    const s = getSocket()
    s.emit('channel:join', channelId)

    const onNew = (m: ChatMessage) => {
      if (m.channelId !== channelId) return
      qc.setQueryData<ChatMessage[]>(['messages', channelId], (cur) => {
        if (!cur) return [m]
        if (m.tempId) {
          const i = cur.findIndex((x) => x.id === m.tempId || x.id === m.id)
          if (i >= 0) {
            const next = [...cur]
            next[i] = m
            return next
          }
        }
        if (cur.some((x) => x.id === m.id)) return cur
        return [...cur, m]
      })
    }
    const onUpd = (p: { id: string; channelId: string; content: string; editedAt: string }) => {
      qc.setQueryData<ChatMessage[]>(['messages', p.channelId], (cur) =>
        cur?.map((x) => (x.id === p.id ? { ...x, content: p.content, editedAt: p.editedAt } : x)),
      )
    }
    const onDel = (p: { id: string; channelId: string }) => {
      qc.setQueryData<ChatMessage[]>(['messages', p.channelId], (cur) => cur?.filter((x) => x.id !== p.id))
    }

    s.on('message:new', onNew)
    s.on('message:updated', onUpd)
    s.on('message:deleted', onDel)
    return () => {
      s.emit('channel:leave', channelId)
      s.off('message:new', onNew)
      s.off('message:updated', onUpd)
      s.off('message:deleted', onDel)
    }
  }, [channelId, qc])

  async function send(content: string) {
    if (!channelId) return
    const trimmed = content.trim()
    if (!trimmed) return
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const s = getSocket()
    s.emit('message:create', { channelId, content: trimmed, tempId })
  }

  async function edit(id: string, content: string) {
    await api.patch(`/messages/${id}`, { content })
  }
  async function remove(id: string) {
    await api.delete(`/messages/${id}`)
  }

  async function loadMore(currentOldestIso?: string) {
    if (!channelId || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { data } = await api.get<ChatMessage[]>(`/channels/${channelId}/messages`, {
        params: { before: currentOldestIso, limit: 30 },
      })
      if (data.length === 0) {
        setHasMore(false)
      } else {
        qc.setQueryData<ChatMessage[]>(['messages', channelId], (cur) => {
          const ids = new Set((cur || []).map((m) => m.id))
          const merged = [...data.filter((m) => !ids.has(m.id)), ...(cur || [])]
          return merged
        })
        if (data.length < 30) setHasMore(false)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  return { send, edit, remove, loadMore, loadingMore, hasMore, extra }
}
