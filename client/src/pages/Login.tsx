import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-rail p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-panel rounded-md p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-text-hi text-center">Welcome back!</h1>
        <p className="text-text-sub text-center mt-1 mb-6 text-sm">
          We&rsquo;re so excited to see you again.
        </p>

        <label className="cap block mb-2">Username</label>
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-rail rounded-[3px] px-3 h-10 text-text-body outline-none focus:ring-1 focus:ring-brand mb-4"
        />

        <label className="cap block mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-rail rounded-[3px] px-3 h-10 text-text-body outline-none focus:ring-1 focus:ring-brand mb-2"
        />

        {err && <div className="text-danger text-sm mb-3">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 mt-4 bg-brand hover:bg-brand-hi rounded-[3px] font-medium text-white disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log In'}
        </button>

        <p className="text-text-sub text-sm mt-4">
          Need an account?{' '}
          <Link to="/register" className="text-mention hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}
