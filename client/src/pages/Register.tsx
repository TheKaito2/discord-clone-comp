import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import DiscordLogo from '../components/DiscordLogo'

function rules(pw: string) {
  return {
    len: pw.length >= 6,
    num: /\d/.test(pw),
    let: /[a-zA-Z]/.test(pw),
  }
}

export default function Register() {
  const nav = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const r = rules(password)
  const validPw = r.len && r.num && r.let
  const validUser = username.trim().length >= 3
  const canSubmit = validPw && validUser && !busy

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const { data } = await api.post('/auth/register', { username, password })
      setSession(data.token, data.user)
      nav('/app', { replace: true })
    } catch (e) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErr(m || 'Register failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-aurora flex items-center justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-1/4 w-[560px] h-[560px] rounded-full opacity-50 blur-3xl anim-float"
        style={{ background: 'radial-gradient(circle, rgba(88,101,242,0.5), transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/4 w-[520px] h-[520px] rounded-full opacity-45 blur-3xl anim-float"
        style={{ background: 'radial-gradient(circle, rgba(35,165,89,0.35), transparent 65%)', animationDelay: '-2.5s' }}
      />
      <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.35] pointer-events-none" />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md glass-panel rounded-2xl p-8 sm:p-10 shadow-elev2 anim-scale-in"
      >
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-xl bg-brand grid place-items-center shadow-glow-brand">
            <DiscordLogo size={22} />
          </div>
          <span className="text-text-hi font-bold text-[18px] tracking-tight">Discord</span>
        </div>

        <h1 className="text-[26px] font-bold text-text-hi text-center tracking-tight">Create an account</h1>
        <p className="text-text-mute text-center mt-1.5 mb-7 text-[14.5px]">
          Pick a username. You can change it later.
        </p>

        <label className="block text-[12px] font-bold uppercase tracking-cap text-text-mute mb-2">
          Username <span className="text-danger">*</span>
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          required
          autoFocus
          placeholder="3+ characters"
          className="input-fld mb-4"
        />

        <label className="block text-[12px] font-bold uppercase tracking-cap text-text-mute mb-2">
          Password <span className="text-danger">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          className="input-fld"
        />

        <div className="grid grid-cols-3 gap-2 mt-3">
          <Rule ok={r.len} label="6+ chars" />
          <Rule ok={r.let} label="a letter" />
          <Rule ok={r.num} label="a number" />
        </div>

        {err && (
          <div className="mt-3 bg-danger/10 border border-danger/30 text-danger text-[13px] px-3 py-2 rounded anim-slide-up">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-11 mt-5 btn-primary text-[15px] disabled:opacity-60 disabled:hover:translate-y-0 shadow-glow-brand"
        >
          {busy ? 'Creating…' : 'Continue'}
        </button>

        <p className="text-text-sub text-[14px] mt-4">
          Already have one?{' '}
          <Link to="/login" className="text-mention hover:underline font-medium">
            Log in
          </Link>
        </p>

        <p className="text-[11px] text-text-meta mt-5 leading-4">
          By registering, you agree to Discord&rsquo;s{' '}
          <span className="text-text-mute hover:underline cursor-pointer">Terms</span> and{' '}
          <span className="text-text-mute hover:underline cursor-pointer">Privacy Policy</span>.
        </p>
      </form>
    </div>
  )
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] font-medium px-2 h-6 rounded transition-colors ${
        ok ? 'bg-online/15 text-online' : 'bg-rail/60 text-text-sub'
      }`}
    >
      {ok ? <Check size={12} /> : <X size={12} />}
      <span className="truncate">{label}</span>
    </div>
  )
}
