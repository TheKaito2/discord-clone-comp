import { useEffect } from 'react'
import { getSocket } from '../../lib/socket'
import { useVoiceStore, type RosterMember } from '../../store/voice'

export function useVoiceRosterSync() {
  const setRoster = useVoiceStore((s) => s.setRoster)

  useEffect(() => {
    const s = getSocket()
    function onRoster(p: { channelId: string; members: RosterMember[] }) {
      setRoster(p.channelId, p.members || [])
    }
    s.on('voice:roster', onRoster)
    return () => { s.off('voice:roster', onRoster) }
  }, [setRoster])
}
