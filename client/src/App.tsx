import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import AppShell from './pages/AppShell'
import { useAuthStore } from './store/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app/:guildId?/:channelId?"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
