// Discord SFX layer. One Audio per sound, cloned on each play so rapid events overlap.
// Volumes are tuned conservatively — voice events louder than chat.

export type SfxKey =
  | 'message'
  | 'mention'
  | 'voice-join'
  | 'voice-leave'
  | 'voice-disconnect'
  | 'mute'
  | 'unmute'
  | 'undeafen'
  | 'outgoing'
  | 'incoming'
  | 'ptt-on'
  | 'ptt-off'
  | 'ping'

const FILES: Record<SfxKey, string> = {
  message:           '/sounds/Voicy_Discord Message.mp3',
  mention:           '/sounds/Voicy_Discord Mention.mp3',
  'voice-join':      '/sounds/Voicy_Discord Joined.mp3',
  'voice-leave':     '/sounds/Voicy_Discord Left.mp3',
  'voice-disconnect':'/sounds/Voicy_Discord Voice disconnect.mp3',
  mute:              '/sounds/Voicy_Discord Mute.mp3',
  unmute:            '/sounds/Voicy_Discord Unmute.mp3',
  undeafen:          '/sounds/Voicy_Discord Undeafen.mp3',
  outgoing:          '/sounds/Voicy_Discord Outgoing ring.mp3',
  incoming:          '/sounds/Voicy_discord incoming call.mp3',
  'ptt-on':          '/sounds/Voicy_Discord PTT Activate.mp3',
  'ptt-off':         '/sounds/Voicy_Discord PTT Deactivate.mp3',
  ping:              '/sounds/Voicy_Discord New Ping.mp3',
}

const VOL: Partial<Record<SfxKey, number>> = {
  message: 0.35,
  mention: 0.6,
  'voice-join': 0.5,
  'voice-leave': 0.5,
  'voice-disconnect': 0.6,
  mute: 0.4,
  unmute: 0.4,
  undeafen: 0.4,
  outgoing: 0.45,
  incoming: 0.5,
  'ptt-on': 0.3,
  'ptt-off': 0.3,
  ping: 0.5,
}

const cache: Partial<Record<SfxKey, HTMLAudioElement>> = {}
let muted = false

function get(key: SfxKey) {
  if (!cache[key]) {
    const a = new Audio(FILES[key])
    a.preload = 'auto'
    cache[key] = a
  }
  return cache[key]!
}

export const sfx = {
  play(key: SfxKey) {
    if (muted) return
    try {
      const src = get(key)
      const clone = src.cloneNode(true) as HTMLAudioElement
      clone.volume = VOL[key] ?? 0.4
      const p = clone.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch { /* ignore */ }
  },
  setMuted(m: boolean) { muted = m },
  isMuted() { return muted },
}
