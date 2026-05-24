import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type Channel = {
  id: string
  name: string
  type: 'text' | 'voice'
  category: string
  topic: string
  position: number
}
export type Guild = {
  id: string
  name: string
  iconUrl: string
  bannerUrl: string
  inviteCode: string
  ownerId: string
  channels: Channel[]
}
export type Member = {
  id: string
  username: string
  avatarColor: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
}
export type ChatMessage = {
  id: string
  channelId: string
  author: { id: string; username: string; avatarColor: string }
  content: string
  createdAt: string
  editedAt: string | null
  tempId?: string | null
  pending?: boolean
}

export function useGuilds() {
  return useQuery({
    queryKey: ['guilds'],
    queryFn: async () => (await api.get<Guild[]>('/me/guilds')).data,
  })
}

export function useMembers(guildId: string | undefined) {
  return useQuery({
    queryKey: ['members', guildId],
    enabled: !!guildId,
    queryFn: async () =>
      (await api.get<Member[]>(`/guilds/${guildId}/members`)).data,
  })
}

export function useMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: ['messages', channelId],
    enabled: !!channelId,
    queryFn: async () =>
      (await api.get<ChatMessage[]>(`/channels/${channelId}/messages?limit=50`)).data,
  })
}
