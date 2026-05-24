import { useEffect, useState } from 'react'
import { X, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

type Preview = { id: string; name: string; iconUrl: string; bannerUrl: string; memberCount: number }

export default function JoinModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()
  const nav = useNavigate()

  useEffect(() => {
    const c = code.trim()
    if (c.length < 4) {
      setPreview(null)
      setErr(null)
      return
    }
    let stale = false
    setErr(null)
    setBusy(true)
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get<Preview>(`/invites/${c}`)
        if (!stale) setPreview(data)
      } catch (e) {
        const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        if (!stale) {
          setPreview(null)
          setErr(m || 'Invalid invite')
        }
      } finally {
        if (!stale) setBusy(false)
      }
    }, 250)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [code])

  async function join() {
    if (!preview) return
    setBusy(true)
    try {
      const { data } = await api.post(`/invites/${code.trim()}/join`)
      await qc.invalidateQueries({ queryKey: ['guilds'] })
      onClose()
      nav(`/app/${data.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 grid place-items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-panel rounded-lg shadow-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between p-4 border-b border-rail/60">
          <h2 className="font-bold text-text-hi text-lg">Join a server</h2>
          <button onClick={onClose} className="text-text-sub hover:text-text-hi">
            <X size={20} />
          </button>
        </header>
        <div className="p-5">
          <label className="cap block mb-2">Invite Link or Code</label>
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. xjdRyF_4"
            className="w-full bg-rail rounded px-3 h-10 text-text-body outline-none focus:ring-1 focus:ring-brand"
          />

          {err && <div className="text-danger text-sm mt-3">{err}</div>}

          {preview && (
            <div className="mt-5 bg-rail rounded-md p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand grid place-items-center text-white font-bold text-lg">
                {preview.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-text-hi font-semibold truncate">{preview.name}</div>
                <div className="text-text-sub text-xs flex items-center gap-1 mt-0.5">
                  <Users size={12} />
                  <span>{preview.memberCount} members</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              className="px-4 h-10 text-text-hi hover:underline"
            >
              Cancel
            </button>
            <button
              disabled={!preview || busy}
              onClick={join}
              className="px-4 h-10 bg-brand hover:bg-brand-hi disabled:opacity-50 rounded font-medium text-white"
            >
              {busy ? 'Joining…' : 'Join Server'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
