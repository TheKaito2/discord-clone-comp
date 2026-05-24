import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type User = {
  id: string
  username: string
  displayName?: string
  email?: string
  phone?: string
  avatarColor: string
  avatarUrl?: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
}

type AuthState = {
  token: string | null
  user: User | null
  setSession: (token: string, user: User) => void
  clear: () => void
  patchUser: (patch: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
      patchUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
    }),
    { name: 'cordis-auth' },
  ),
)
