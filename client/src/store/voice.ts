import { create } from 'zustand'

export type RosterMember = { socketId: string; userId: string; username: string }

type VoiceState = {
  activeChannelId: string | null
  roster: Record<string, RosterMember[]>
  speakingUsers: Set<string>
  // mirror of useWebRTC local mic/deafen state so UserPanel can show + toggle
  micOn: boolean
  deafened: boolean
  // imperative bridge: useWebRTC registers its toggles here when joined
  toggleMicFn: (() => void) | null
  toggleDeafenFn: (() => void) | null
  setActive: (channelId: string | null) => void
  setRoster: (channelId: string, members: RosterMember[]) => void
  setSpeaking: (userId: string, on: boolean) => void
  setMicOn: (on: boolean) => void
  setDeafened: (on: boolean) => void
  registerControls: (
    toggleMic: (() => void) | null,
    toggleDeafen: (() => void) | null,
  ) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeChannelId: null,
  roster: {},
  speakingUsers: new Set(),
  micOn: true,
  deafened: false,
  toggleMicFn: null,
  toggleDeafenFn: null,
  setActive: (channelId) => set({ activeChannelId: channelId }),
  setRoster: (channelId, members) =>
    set((s) => ({ roster: { ...s.roster, [channelId]: members } })),
  setSpeaking: (userId, on) =>
    set((s) => {
      const next = new Set(s.speakingUsers)
      if (on) next.add(userId)
      else next.delete(userId)
      return { speakingUsers: next }
    }),
  setMicOn: (on) => set({ micOn: on }),
  setDeafened: (on) => set({ deafened: on }),
  registerControls: (toggleMicFn, toggleDeafenFn) =>
    set({ toggleMicFn, toggleDeafenFn }),
}))
