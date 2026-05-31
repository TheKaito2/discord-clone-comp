import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api'
import Avatar from '../../components/Avatar'

type Hit = {
  id: string
  channelId: string
  channelName: string
  author: { id: string; username: string; avatarColor: string; avatarUrl?: string }
  content: string
  createdAt: string
}

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { guildId } = useParams()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setHits([])
      return
    }
    let stale = false
    setBusy(true)
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get<{ messages: Hit[] }>('/search', {
          params: { q: term, guildId },
        })
        if (!stale) setHits(data.messages)
      } finally {
        if (!stale) setBusy(false)
      }
    }, 200)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [q, guildId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 anim-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl glass-panel rounded-xl shadow-elev2 overflow-hidden anim-scale-in"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rail/60">
          <Search size={20} className="text-text-sub" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages in this server…"
            className="flex-1 bg-transparent text-text-body outline-none text-[15px]"
          />
          {busy && <span className="text-xs text-text-sub">…</span>}
          <button onClick={onClose} className="text-text-sub hover:text-text-hi">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim() && hits.length === 0 && !busy && (
            <div className="p-6 text-center text-text-sub">No matches</div>
          )}
          {hits.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                if (guildId) nav(`/app/${guildId}/${h.channelId}`)
                onClose()
              }}
              className="w-full text-left px-4 py-3 flex gap-3 hover:bg-hover-a border-b border-rail/30 last:border-b-0"
            >
              <Avatar username={h.author.username} avatarColor={h.author.avatarColor} avatarUrl={h.author.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-text-hi font-medium text-sm">{h.author.username}</span>
                  <span className="text-text-sub text-xs">in #{h.channelName}</span>
                  <span className="text-text-sub text-xs ml-auto">
                    {new Date(h.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <Highlight text={h.content} term={q} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Highlight({ text, term }: { text: string; term: string }) {
  const i = text.toLowerCase().indexOf(term.toLowerCase())
  if (i === -1)
    return <div className="text-[14px] text-text-body truncate">{text}</div>
  return (
    <div className="text-[14px] text-text-body truncate">
      {text.slice(0, i)}
      <mark className="bg-mention/30 text-text-hi px-0.5 rounded">
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </div>
  )
}
