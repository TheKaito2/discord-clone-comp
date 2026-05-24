import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import DiscordLogo from '../components/DiscordLogo'

export default function Login() {
  const nav = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [username, setUsername] = useState('alice')
  const [password, setPassword] = useState('password')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      setSession(data.token, data.user)
      nav('/app', { replace: true })
    } catch (e) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErr(m || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function quickLogin(u: string) {
    setUsername(u)
    setPassword('password')
    setErr(null)
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { username: u, password: 'password' })
      setSession(data.token, data.user)
      nav('/app', { replace: true })
    } catch (e) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErr(m || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(88,101,242,0.35) 0%, transparent 60%), radial-gradient(900px 500px at 100% 110%, rgba(148,156,247,0.25) 0%, transparent 60%), #1E1F22',
      }}
    >
      <div className="w-full max-w-4xl bg-panel rounded-lg shadow-2xl flex overflow-hidden">
        {/* Form side */}
        <form onSubmit={onSubmit} className="flex-1 p-8 sm:p-10 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <DiscordLogo size={32} />
            <span className="text-text-hi font-bold text-lg">Discord</span>
          </div>

          <h1 className="text-[24px] font-bold text-text-hi text-center">Welcome back!</h1>
          <p className="text-text-mute text-center mt-1 mb-6 text-[15px]">
            We&rsquo;re so excited to see you again.
          </p>

          <label className="block text-[12px] font-bold uppercase tracking-cap text-text-mute mb-2">
            Username <span className="text-danger">*</span>
          </label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-rail rounded-[3px] px-3 h-10 text-text-body outline-none focus:ring-1 focus:ring-brand mb-4 text-[15px]"
          />

          <label className="block text-[12px] font-bold uppercase tracking-cap text-text-mute mb-2">
            Password <span className="text-danger">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-rail rounded-[3px] px-3 h-10 text-text-body outline-none focus:ring-1 focus:ring-brand mb-2 text-[15px]"
          />

          <button
            type="button"
            className="text-mention hover:underline text-[13px] mb-2"
          >
            Forgot your password?
          </button>

          {err && <div className="text-danger text-sm mb-3">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 mt-4 bg-brand hover:bg-brand-hi rounded-[3px] font-medium text-white disabled:opacity-60 transition-colors"
          >
            {busy ? 'Logging in…' : 'Log In'}
          </button>

          <p className="text-text-sub text-[14px] mt-4">
            Need an account?{' '}
            <Link to="/register" className="text-mention hover:underline">
              Register
            </Link>
          </p>

          <div className="mt-6 pt-4 border-t border-divider/60">
            <div className="text-[12px] uppercase tracking-cap font-bold text-text-mute mb-2">Demo accounts</div>
            <div className="flex flex-wrap gap-2">
              {['alice', 'bob', 'carol', 'dave', 'eve', 'frank'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => quickLogin(u)}
                  disabled={busy}
                  className="px-3 h-7 rounded-full bg-rail hover:bg-hover-a text-text-mute hover:text-text-hi text-[13px] font-medium transition-colors disabled:opacity-50"
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* QR / brand side — hidden on narrow screens */}
        <aside className="hidden md:flex flex-col items-center justify-center p-8 w-[300px] bg-panel border-l border-rail/40">
          <div className="w-[180px] h-[180px] rounded bg-white grid place-items-center text-rail font-bold text-sm">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto bg-rail rounded grid place-items-center">
                <DiscordLogo size={64} />
              </div>
            </div>
          </div>
          <h2 className="text-text-hi font-bold text-[20px] mt-6 text-center">Log in with QR Code</h2>
          <p className="text-text-mute text-[14px] text-center mt-2">
            Scan this with the <span className="font-semibold">Discord mobile app</span> to log in instantly.
          </p>
        </aside>
      </div>
    </div>
  )
}
