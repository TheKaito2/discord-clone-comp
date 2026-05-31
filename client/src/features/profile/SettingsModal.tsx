import { useEffect, useState } from 'react'
import { X, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/auth'
import { disconnectSocket } from '../../lib/socket'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../components/Avatar'
import { api } from '../../lib/api'

const statusDot: Record<string, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-offline',
}
const statusLabel: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Invisible',
}

// d20 sidebar groups — matches Discord User Settings layout
const GROUPS: { label: string; items: { key: string; label: string; badge?: string }[] }[] = [
  {
    label: 'User Settings',
    items: [
      { key: 'account', label: 'My Account' },
      { key: 'profile', label: 'User Profile' },
      { key: 'privacy', label: 'Privacy & Safety' },
      { key: 'authorized', label: 'Authorized Apps' },
      { key: 'connections', label: 'Connections' },
      { key: 'friends', label: 'Friend Requests', badge: 'new' },
    ],
  },
  {
    label: 'Billing Settings',
    items: [
      { key: 'nitro', label: 'Nitro' },
      { key: 'boosts', label: 'Server Boost' },
      { key: 'sub', label: 'Subscriptions' },
      { key: 'gift', label: 'Gift Inventory' },
      { key: 'billing', label: 'Billing' },
    ],
  },
  {
    label: 'App Settings',
    items: [
      { key: 'appearance', label: 'Appearance' },
      { key: 'accessibility', label: 'Accessibility' },
      { key: 'voice', label: 'Voice & Video' },
      { key: 'text', label: 'Text & Images' },
      { key: 'notif', label: 'Notifications' },
      { key: 'keybinds', label: 'Keybinds' },
      { key: 'lang', label: 'Language' },
      { key: 'stream', label: 'Streamer Mode' },
      { key: 'advanced', label: 'Advanced' },
    ],
  },
]

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState('account')
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const nav = useNavigate()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function logout() {
    disconnectSocket()
    clear()
    nav('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex bg-bg anim-fade-in">
      {/* Sidebar — pinned far-left */}
      <aside className="w-[232px] shrink-0 bg-panel py-[60px] pl-3 pr-1.5 overflow-y-auto">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-2">
            <div className="px-2.5 pb-1.5 text-[11px] font-bold uppercase text-text-sub tracking-cap leading-4">
              {g.label}
            </div>
            {g.items.map((it) => (
              <button
                key={it.key}
                onClick={() => setActive(it.key)}
                className={clsx(
                  'flex items-center justify-between w-full pl-2.5 pr-2.5 h-7 mb-0.5 rounded-[4px] text-[15px] font-medium leading-5 text-left',
                  active === it.key
                    ? 'bg-active-a text-text-hi'
                    : 'text-text-sub hover:bg-hover-a hover:text-text-mute',
                )}
              >
                <span>{it.label}</span>
                {it.badge && (
                  <span className="bg-danger text-white text-[11px] font-bold uppercase px-1.5 rounded leading-4 tracking-cap">
                    {it.badge}
                  </span>
                )}
              </button>
            ))}
            <div className="h-px bg-divider/60 my-2 mx-2" />
          </div>
        ))}
        <button
          onClick={logout}
          className="flex items-center justify-between w-full pl-2.5 pr-2.5 h-7 mb-0.5 rounded-[4px] text-[15px] font-medium leading-5 text-text-sub hover:bg-hover-a hover:text-text-mute"
        >
          <span>Log Out</span>
          <LogOut size={16} />
        </button>
      </aside>

      {/* Content — fills remaining width, capped at 740 */}
      <div className="flex-1 min-w-0 bg-bg py-[60px] pl-10 pr-[80px] overflow-y-auto">
        <div className="max-w-[740px]">
          {active === 'account' && <MyAccount />}
          {active !== 'account' && (
            <Placeholder label={GROUPS.flatMap((g) => g.items).find((i) => i.key === active)?.label || ''} />
          )}
        </div>
      </div>

      {/* ESC button — absolute top-right of viewport */}
      <div className="absolute top-[60px] right-[24px] z-10">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full border-2 border-text-mute text-text-mute hover:border-text-hi hover:text-text-hi grid place-items-center transition-colors"
          title="Close (Esc)"
        >
          <X size={16} />
        </button>
        <div className="text-[13px] font-semibold text-text-mute text-center mt-1 leading-[13px]">ESC</div>
      </div>
    </div>
  )
}

const COLOR_SWATCHES = ['#5865F2', '#EB459E', '#FAA61A', '#23A559', '#F23F42', '#9139FF', '#00A8FC', '#80848E']

function MyAccount() {
  const user = useAuthStore((s) => s.user)!
  const patchUser = useAuthStore((s) => s.patchUser)
  const [showColor, setShowColor] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const displayName = user.displayName || user.username
  const email = user.email || `${user.username.toLowerCase()}@discord.dev`

  async function save(patch: Partial<typeof user>): Promise<boolean> {
    setErr(null)
    try {
      const { data } = await api.patch('/me', patch)
      patchUser(data)
      return true
    } catch (e) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErr(m || 'Update failed')
      return false
    }
  }

  return (
    <>
      <h1 className="text-[20px] font-semibold text-text-hi leading-6 mb-5">My Account</h1>
      {err && <div className="bg-danger/15 text-danger text-[14px] px-3 py-2 rounded mb-3">{err}</div>}

      {/* Profile card — banner + avatar + identity (matches status bar) */}
      <div className="bg-rail rounded-lg overflow-hidden mb-10">
        <div className="h-[100px]" style={{ background: user.avatarColor }} />
        <div className="relative px-4 pb-4">
          <div className="absolute -top-10 left-4">
            <div className="relative">
              <div className="ring-[6px] ring-rail rounded-full inline-block">
                <Avatar
                  username={user.username}
                  avatarColor={user.avatarColor}
                  avatarUrl={user.avatarUrl}
                  size={80}
                />
              </div>
              <span
                className={clsx(
                  'absolute bottom-1 right-1 w-[22px] h-[22px] rounded-full ring-[5px] ring-rail',
                  statusDot[user.status] || 'bg-offline',
                )}
                title={statusLabel[user.status]}
              />
            </div>
          </div>
          <div className="flex items-start justify-between pt-3">
            <div className="ml-[100px]">
              <div className="text-[20px] font-semibold text-text-hi leading-6">{displayName}</div>
              <div className="text-[14px] text-text-mute leading-5 mt-0.5 flex items-center gap-1.5">
                <span className={clsx('w-2 h-2 rounded-full', statusDot[user.status] || 'bg-offline')} />
                {statusLabel[user.status] || 'Online'}
              </div>
            </div>
            <button
              onClick={() => setShowColor((v) => !v)}
              className="bg-brand hover:bg-brand-hi text-white text-[14px] font-medium px-4 h-8 rounded leading-4"
            >
              Edit User Profile
            </button>
          </div>

          {showColor && (
            <div className="bg-bg rounded-lg p-3 mt-3">
              <div className="text-[12px] font-bold uppercase tracking-cap text-text-mute mb-2">Banner Color</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={async () => {
                      const ok = await save({ avatarColor: c })
                      if (ok) setShowColor(false)
                    }}
                    className={clsx(
                      'w-9 h-9 rounded-full ring-2 transition-transform hover:scale-110',
                      user.avatarColor === c ? 'ring-text-hi' : 'ring-transparent',
                    )}
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="bg-bg rounded-lg p-4 mt-4 space-y-4">
            <Field label="Display Name" value={displayName} onSave={(v) => save({ displayName: v })} />
            <Field label="Username" value={user.username} onSave={(v) => save({ username: v })} />
            <Field label="Email" value={email} masked onSave={(v) => save({ email: v })} />
            <Field
              label="Phone Number"
              value={user.phone || ''}
              placeholder="You haven't added a phone number yet."
              onSave={(v) => save({ phone: v })}
            />
          </div>
        </div>
      </div>

      {/* Password & Auth */}
      <h2 className="text-[16px] font-bold uppercase text-text-mute tracking-cap leading-5 mb-4">
        Password and Authentication
      </h2>
      <button className="bg-brand hover:bg-brand-hi text-white text-[14px] font-medium px-4 h-8 rounded leading-4 mb-6">
        Change Password
      </button>
      <h3 className="text-[12px] font-bold uppercase text-text-mute tracking-cap leading-4 mb-2">
        TWO-FACTOR AUTHENTICATION
      </h3>
      <p className="text-[14px] text-text-mute leading-5 mb-3 max-w-md">
        Protect your Discord account with an extra layer of security. Once configured, you'll be required to enter both your password and an authentication code from your mobile phone in order to sign in.
      </p>
      <button className="bg-online hover:bg-online/90 text-white text-[14px] font-medium px-4 h-8 rounded leading-4">
        Enable Authenticator App
      </button>
    </>
  )
}

function Field({
  label,
  value,
  masked,
  placeholder,
  onSave,
}: {
  label: string
  value: string
  masked?: boolean
  placeholder?: string
  onSave: (next: string) => Promise<boolean>
}) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)

  // re-sync draft when value changes upstream
  useEffect(() => { setDraft(value) }, [value])

  const isEmpty = !value
  const mask = (v: string) => {
    const at = v.indexOf('@')
    if (at <= 0) return '•'.repeat(Math.min(12, Math.max(4, v.length)))
    return '•'.repeat(Math.max(6, at)) + v.slice(at)
  }
  const display = isEmpty ? (placeholder || '') : masked && !show ? mask(value) : value

  async function commit() {
    setBusy(true)
    const ok = await onSave(draft.trim())
    setBusy(false)
    if (ok) setEditing(false)
  }

  if (editing) {
    return (
      <div>
        <div className="text-[12px] font-bold uppercase text-text-mute tracking-cap leading-4">{label}</div>
        <div className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              else if (e.key === 'Escape') { setDraft(value); setEditing(false) }
            }}
            className="flex-1 bg-rail rounded h-8 px-3 text-[15px] text-text-hi outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            disabled={busy || draft.trim() === value}
            onClick={commit}
            className="bg-online hover:bg-online/90 disabled:opacity-50 text-white text-[14px] font-medium px-3 h-8 rounded leading-4"
          >
            {busy ? '…' : 'Save'}
          </button>
          <button
            onClick={() => { setDraft(value); setEditing(false) }}
            className="text-text-mute hover:text-text-hi text-[14px] px-2 h-8"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <div className="text-[12px] font-bold uppercase text-text-mute tracking-cap leading-4">{label}</div>
        <div className={clsx('text-[15px] mt-1 leading-5 truncate', isEmpty ? 'text-text-mute' : 'text-text-hi')}>
          {display}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {masked && !isEmpty && (
          <button onClick={() => setShow((v) => !v)} className="text-[14px] text-brand hover:underline">
            {show ? 'Hide' : 'Reveal'}
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          className="bg-[#4E5058] hover:bg-[#6D6F78] text-text-hi text-[14px] font-medium px-4 h-8 rounded leading-4"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

function Placeholder({ label }: { label: string }) {
  return (
    <>
      <h1 className="text-[20px] font-semibold text-text-hi leading-6 mb-5">{label}</h1>
      <p className="text-[14px] text-text-mute leading-5">This section is part of the design tour — settings here are visual references only.</p>
    </>
  )
}
