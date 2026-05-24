import { useState } from 'react'
import type { ChatMessage } from '../../lib/queries'
import { useAuthStore } from '../../store/auth'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import Avatar from '../../components/Avatar'

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function MessageItem({
  m,
  hideHeader,
  onEdit,
  onDelete,
}: {
  m: ChatMessage
  hideHeader: boolean
  onEdit: (id: string, content: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}) {
  const meId = useAuthStore((s) => s.user?.id)
  const mine = meId === m.author.id
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.content)

  return (
    <div className="group flex gap-4 px-4 py-0.5 hover:bg-bg-grad/40 relative">
      <div className="w-10 shrink-0 pt-0.5">
        {!hideHeader ? (
          <Avatar
            username={m.author.username}
            avatarColor={m.author.avatarColor}
            avatarUrl={m.author.avatarUrl}
            size={40}
          />
        ) : (
          <span className="invisible text-[11px] text-text-sub group-hover:visible block text-right pr-1 pt-1">
            {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {!hideHeader && (
          <div className="flex items-baseline gap-2">
            <span
              className="font-medium text-[15px] leading-[22px]"
              style={{ color: m.author.avatarColor }}
            >
              {m.author.username}
            </span>
            <span className="text-[11px] leading-[22px] font-medium text-text-sub">{fmtTime(m.createdAt)}</span>
          </div>
        )}
        {editing ? (
          <div className="mt-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="w-full bg-rail rounded p-2 text-[15px] text-text-body outline-none focus:ring-1 focus:ring-brand resize-y"
              rows={Math.min(6, Math.max(2, draft.split('\n').length))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (draft.trim() && draft !== m.content) onEdit(m.id, draft.trim())
                  setEditing(false)
                } else if (e.key === 'Escape') {
                  setDraft(m.content)
                  setEditing(false)
                }
              }}
            />
            <div className="flex gap-2 mt-1 text-xs text-text-sub">
              <button onClick={() => { setDraft(m.content); setEditing(false) }} className="hover:text-text-hi inline-flex items-center gap-1">
                <X size={12} /> cancel
              </button>
              <button
                onClick={() => { if (draft.trim()) onEdit(m.id, draft.trim()); setEditing(false) }}
                className="text-online hover:underline inline-flex items-center gap-1"
              >
                <Check size={12} /> save
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[15px] text-text-body leading-[20px] break-words whitespace-pre-wrap mt-0.5">
            {m.content}
            {m.editedAt && <span className="text-[9px] leading-[10px] text-text-sub ml-1">(edited)</span>}
            {m.pending && <span className="text-[9px] leading-[10px] text-text-sub ml-1">…</span>}
          </div>
        )}
      </div>

      {mine && !editing && (
        <div className="opacity-0 group-hover:opacity-100 absolute right-4 top-0 bg-panel rounded shadow flex">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-text-sub hover:text-text-hi"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this message?')) onDelete(m.id)
            }}
            className="p-1.5 text-text-sub hover:text-danger"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
