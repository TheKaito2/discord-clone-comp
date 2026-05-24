import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import AppLayout from './pages/AppLayout'
import HomeView from './pages/HomeView'
import DiscoverView from './pages/DiscoverView'
import ServerView from './pages/ServerView'
import DMView from './pages/DMView'
// @ts-ignore
import LandingPage from './pages/LandingPage'
import { useAuthStore } from './store/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomeView />} />
        <Route path="discover" element={<DiscoverView />} />
        <Route path="dm/:channelId" element={<DMView />} />
        <Route path=":guildId" element={<ServerView />} />
        <Route path=":guildId/:channelId" element={<ServerView />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  )
}
