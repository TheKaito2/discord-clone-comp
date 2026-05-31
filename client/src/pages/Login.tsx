import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QrCode, Sparkles, ShieldCheck, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import DiscordLogo from '../components/DiscordLogo'

const DEMOS: { name: string; color: string }[] = [
  { name: 'alice', color: '#5865F2' },
  { name: 'bob',   color: '#EB459E' },
  { name: 'carol', color: '#23A559' },
  { name: 'dave',  color: '#FAA61A' },
  { name: 'eve',   color: '#9139FF' },
  { name: 'frank', color: '#00A8FC' },
]

export default function Login() {
  const nav = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [username, setUsername] = useState('alice')
  const [password, setPassword] = useState('password')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  async function doLogin(u: string, p: string) {
    setErr(null)
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { username: u, password: p })
      setSession(data.token, data.user)
      nav('/app', { replace: true })
    } catch (e) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErr(m || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    doLogin(username, password)
  }

  function quickLogin(u: string) {
    setActiveDemo(u)
    setUsername(u)
    setPassword('password')
    doLogin(u, 'password')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-aurora flex items-center justify-center p-4">
      {/* animated aurora orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-60 blur-3xl anim-float"
        style={{ background: 'radial-gradient(circle, rgba(88,101,242,0.55), transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 w-[620px] h-[620px] rounded-full opacity-50 blur-3xl anim-float"
        style={{ background: 'radial-gradient(circle, rgba(235,69,158,0.45), transparent 65%)', animationDelay: '-3s' }}
      />
      <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.35] pointer-events-none" />

      <div className="relative w-full max-w-5xl rounded-2xl shadow-elev2 flex overflow-hidden anim-scale-in glass-panel">
        {/* Form side */}
        <form onSubmit={onSubmit} className="flex-1 p-8 sm:p-12 min-w-0 relative">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand grid place-items-center shadow-glow-brand">
              <DiscordLogo size={22} />
            </div>
            <span className="text-text-hi font-bold text-[18px] tracking-tight">Discord</span>
          </div>

          <h1 className="text-[28px] font-bold text-text-hi text-center tracking-tight">Welcome back</h1>
          <p className="text-text-mute text-center mt-1.5 mb-7 text-[15px]">
            We&rsquo;re so excited to see you again.
          </p>

          <label className="block text-[12px] font-bold uppercase tracking-cap text-text-mute mb-2">
            Username or Email <span className="text-danger">*</span>
          </label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-fld mb-4"
          />

          <label className="block text-[12px] font-bold uppercase tracking-cap text-text-mute mb-2">
            Password <span className="text-danger">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-fld"
          />

          <button
            type="button"
            className="text-mention hover:underline text-[13px] mt-2"
          >
            Forgot your password?
          </button>

          {err && (
            <div className="mt-3 bg-danger/10 border border-danger/30 text-danger text-[13px] px-3 py-2 rounded anim-slide-up">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 mt-5 btn-primary text-[15px] disabled:opacity-60 shadow-glow-brand"
          >
            {busy ? 'Logging in…' : 'Log In'}
          </button>

          <p className="text-text-sub text-[14px] mt-4">
            Need an account?{' '}
            <Link to="/register" className="text-mention hover:underline font-medium">
              Register
            </Link>
          </p>

          <div className="mt-7 pt-5 border-t border-divider/40">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] uppercase tracking-cap font-bold text-text-mute flex items-center gap-1.5">
                <Sparkles size={12} className="text-mention" /> Demo accounts
              </div>
              <span className="text-[11px] text-text-meta">one-tap sign in</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DEMOS.map((u) => (
                <button
                  key={u.name}
                  type="button"
                  onClick={() => quickLogin(u.name)}
                  disabled={busy}
                  className="group relative h-12 rounded-lg bg-rail/70 hover:bg-rail border border-divider/40 hover:border-text-mute/40 text-text-mute hover:text-text-hi text-[13px] font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 overflow-hidden"
                  title={`Sign in as ${u.name}`}
                >
                  <span
                    className="w-5 h-5 rounded-full text-white text-[11px] font-bold grid place-items-center shrink-0"
                    style={{ background: u.color }}
                  >
                    {u.name[0].toUpperCase()}
                  </span>
                  <span className="truncate">{u.name}</span>
                  {activeDemo === u.name && busy && (
                    <span className="absolute inset-0 bg-brand/10 grid place-items-center text-brand text-[11px] font-semibold">
                      …
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Brand side */}
        <aside className="hidden md:flex flex-col items-center justify-center px-10 py-12 w-[360px] relative shrink-0 border-l border-white/5"
               style={{ background: 'linear-gradient(155deg, rgba(88,101,242,0.20) 0%, rgba(43,45,49,0.6) 100%)' }}>
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

          <div className="relative w-[200px] h-[200px] rounded-2xl bg-white grid place-items-center shadow-elev2">
            <div className="w-[164px] h-[164px] rounded-xl bg-rail grid place-items-center relative">
              <DiscordLogo size={72} />
              <QrCode size={20} className="absolute bottom-2 right-2 text-text-sub" />
            </div>
          </div>
          <h2 className="text-text-hi font-bold text-[20px] mt-7 text-center tracking-tight">Log in with QR Code</h2>
          <p className="text-text-mute text-[13.5px] text-center mt-2 leading-5">
            Scan with the <span className="font-semibold text-text-body">Discord mobile app</span> to log in instantly.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-2.5 w-full">
            <Feature icon={Zap} label="Real-time voice & video" />
            <Feature icon={ShieldCheck} label="JWT-secured sessions" />
            <Feature icon={Sparkles} label="Built for Web Dev Comp 2026" />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px] text-text-mute">
      <span className="w-7 h-7 rounded-md bg-white/5 grid place-items-center text-mention">
        <Icon size={14} />
      </span>
      <span>{label}</span>
    </div>
  )
}
