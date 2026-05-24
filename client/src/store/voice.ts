import { create } from 'zustand'

export type RosterMember = { socketId: string; userId: string; username: string }

type VoiceState = {
  // currently joined voice channel (per session)
  activeChannelId: string | null
  // per-channel rosters from server `voice:roster` event
  roster: Record<string, RosterMember[]>
  setActive: (channelId: string | null) => void
  setRoster: (channelId: string, members: RosterMember[]) => void
  speakingUsers: Set<string>
  setSpeaking: (userId: string, on: boolean) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeChannelId: null,
  roster: {},
  speakingUsers: new Set(),
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
}))
