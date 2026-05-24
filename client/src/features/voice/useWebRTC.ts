import { useEffect, useRef, useState, useCallback } from 'react'
import SimplePeer, { type Instance as PeerInstance, type SignalData } from 'simple-peer'
import { getSocket } from '../../lib/socket'
import { useVoiceStore } from '../../store/voice'
import { sfx } from '../../lib/sfx'

export type VoicePeer = {
  socketId: string
  userId: string
  username: string
  stream?: MediaStream
}

type JoinAck =
  | { ok: false; error: string }
  | { ok: true; peers: { socketId: string; userId: string; username: string }[] }

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

type PeerExt = PeerInstance & {
  addTrack: (t: MediaStreamTrack, s: MediaStream) => void
  removeTrack: (t: MediaStreamTrack, s: MediaStream) => void
  replaceTrack: (o: MediaStreamTrack, n: MediaStreamTrack, s: MediaStream) => void
}

// Produces a valid-but-silent MediaStream so simple-peer can negotiate even without mic
function makeSilentStream(ctx: AudioContext): MediaStream {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const dst = ctx.createMediaStreamDestination()
  gain.gain.value = 0
  oscillator.connect(gain)
  gain.connect(dst)
  oscillator.start()
  return dst.stream
}

export function useWebRTC(channelId: string | undefined) {
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState<Record<string, VoicePeer>>({})
  const [micOn, setMicOn] = useState(true)
  const [deafened, setDeafened] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [micAvailable, setMicAvailable] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  // bumped whenever local OR remote stream tracks change — forces Tile re-render
  const [mediaVer, setMediaVer] = useState(0)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerInstances = useRef<Record<string, PeerInstance>>({})
  const senderTracks = useRef<{ audio?: MediaStreamTrack; video?: MediaStreamTrack }>({})

  const bump = useCallback(() => setMediaVer((v) => v + 1), [])

  const setActive = useVoiceStore((s) => s.setActive)
  const setSpeaking = useVoiceStore((s) => s.setSpeaking)
  const setStoreMicOn = useVoiceStore((s) => s.setMicOn)
  const setStoreDeafened = useVoiceStore((s) => s.setDeafened)
  const registerControls = useVoiceStore((s) => s.registerControls)

  // ── speaking-level meter ──────────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null)
  const meters = useRef<Map<string, { node: AnalyserNode; data: Uint8Array; userId: string }>>(new Map())
  const rafRef = useRef<number | null>(null)
  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      audioCtxRef.current = new Ctor()
    }
    return audioCtxRef.current
  }, [])
  const attachMeter = useCallback((key: string, stream: MediaStream, userId: string) => {
    if (meters.current.has(key)) return
    const tracks = stream.getAudioTracks()
    if (!tracks.length) return
    try {
      const ctx = ensureAudioCtx()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      meters.current.set(key, { node: analyser, data: new Uint8Array(analyser.frequencyBinCount), userId })
    } catch (e) { console.warn('[meter] attach', e) }
  }, [ensureAudioCtx])
  const detachMeter = useCallback((key: string) => {
    meters.current.delete(key)
    setSpeaking(key === 'self' ? 'self' : meters.current.get(key)?.userId || key, false)
  }, [setSpeaking])

  useEffect(() => {
    function tick() {
      meters.current.forEach((m) => {
        m.node.getByteFrequencyData(m.data as Uint8Array<ArrayBuffer>)
        let sum = 0
        for (let i = 0; i < m.data.length; i++) sum += m.data[i]
        const avg = sum / m.data.length
        setSpeaking(m.userId, avg > 14)
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [setSpeaking])

  // ── cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    Object.values(peerInstances.current).forEach((p) => { try { p.destroy() } catch { /* ignore */ } })
    peerInstances.current = {}
    setPeers({})
    setConnected(false)
    setCamOn(false)
    setScreenOn(false)
    setMicOn(true)
    setDeafened(false)
    setMicAvailable(false)
    setMicError(null)
    setStoreMicOn(true)
    setStoreDeafened(false)
    setActive(null)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    senderTracks.current = {}
    meters.current.clear()
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close() } catch { /* ignore */ }
      audioCtxRef.current = null
    }
    bump()
  }, [setActive, setStoreDeafened, setStoreMicOn, bump])

  // ── peer builder ──────────────────────────────────────────────────────────
  const buildPeer = useCallback(
    (initiator: boolean, target: { socketId: string; userId: string; username: string }) => {
      const currentSocketId = getSocket().id
      const stream = localStreamRef.current
      if (!stream || target.socketId === currentSocketId || peerInstances.current[target.socketId]) return
      const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      })

      const onRemoteStream = (remote: MediaStream) => {
        setPeers((s) => ({
          ...s,
          [target.socketId]: { ...(s[target.socketId] || target), stream: remote },
        }))
        attachMeter(target.socketId, remote, target.userId)
        bump()
        remote.onaddtrack = () => bump()
        remote.onremovetrack = () => bump()
      }

      peer.on('signal', (signal: SignalData) => {
        getSocket().emit('voice:signal', { toSocketId: target.socketId, signal })
      })
      peer.on('stream', onRemoteStream)
      peer.on('track', (_track: MediaStreamTrack, remote: MediaStream) => {
        setPeers((s) => ({
          ...s,
          [target.socketId]: { ...(s[target.socketId] || target), stream: remote },
        }))
        bump()
      })
      peer.on('error', (e: { message?: string }) => console.warn('[peer]', target.username, e?.message))
      peer.on('close', () => {
        detachMeter(target.socketId)
        delete peerInstances.current[target.socketId]
        setPeers((s) => {
          const c = { ...s }
          delete c[target.socketId]
          return c
        })
        bump()
      })
      peerInstances.current[target.socketId] = peer
      setPeers((s) => ({ ...s, [target.socketId]: { ...target, ...s[target.socketId] } }))
    },
    [attachMeter, detachMeter, bump],
  )

  // ── join ──────────────────────────────────────────────────────────────────
  const join = useCallback(
    async (chId: string) => {
      setError(null)
      setMicError(null)

      let stream: MediaStream
      let hasMic = false

      try {
        // Use the original stream from getUserMedia — do NOT extract the track,
        // keeping the stream alive prevents the browser from stopping the track.
        stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: false })
        hasMic = true
      } catch {
        // Fall back: join listen-only with a silent stream so simple-peer can
        // still negotiate and the user can hear others.
        const ctx = ensureAudioCtx()
        stream = makeSilentStream(ctx)
        setMicError('Microphone unavailable')
      }

      localStreamRef.current = stream
      senderTracks.current.audio = stream.getAudioTracks()[0]
      setMicAvailable(hasMic)
      setMicOn(hasMic)
      setStoreMicOn(hasMic)
      if (hasMic) attachMeter('self', stream, 'self')

      const s = getSocket()
      const ack: JoinAck = await new Promise((resolve) => {
        s.emit('voice:join', { channelId: chId }, resolve)
      })
      if (!ack.ok) {
        cleanup()
        setError(ack.error || 'Could not join voice channel')
        return
      }
      setConnected(true)
      setActive(chId)
      const remotePeers = ack.peers.filter((p) => p.socketId !== s.id)
      sfx.play(remotePeers.length === 0 ? 'outgoing' : 'voice-join')
      remotePeers.forEach((p) => buildPeer(true, p))
      bump()
    },
    [ensureAudioCtx, buildPeer, cleanup, setActive, attachMeter, bump, setStoreMicOn],
  )

  // ── request (or re-request) mic ───────────────────────────────────────────
  const requestMic = useCallback(async () => {
    let newStream: MediaStream
    try {
      newStream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: false })
    } catch {
      return  // still can't get mic
    }

    const newTrack = newStream.getAudioTracks()[0]
    if (!newTrack) return
    const local = localStreamRef.current
    if (!local) return

    const oldTrack = senderTracks.current.audio
    if (oldTrack) {
      try { local.removeTrack(oldTrack) } catch { /* ignore */ }
      oldTrack.stop()
    }
    local.addTrack(newTrack)
    senderTracks.current.audio = newTrack

    Object.values(peerInstances.current).forEach((p) => {
      try {
        if (oldTrack) {
          (p as PeerExt).replaceTrack(oldTrack, newTrack, local)
        } else {
          (p as PeerExt).addTrack(newTrack, local)
        }
      } catch (e) { console.warn('[requestMic] replaceTrack', e) }
    })

    attachMeter('self', local, 'self')
    setMicAvailable(true)
    setMicOn(true)
    setStoreMicOn(true)
    setMicError(null)
    bump()
  }, [attachMeter, bump, setStoreMicOn])

  const leave = useCallback(() => {
    const s = getSocket()
    if (channelId) s.emit('voice:leave', { channelId })
    sfx.play('voice-disconnect')
    cleanup()
  }, [channelId, cleanup])

  // socket events
  useEffect(() => {
    if (!channelId) return
    const s = getSocket()
    function onPeerJoined(p: { socketId: string; userId: string; username: string }) {
      if (!localStreamRef.current || p.socketId === s.id || peerInstances.current[p.socketId]) return
      sfx.play('voice-join')
      buildPeer(false, p)
    }
    function onSignal({ fromSocketId, signal }: { fromSocketId: string; signal: SignalData }) {
      if (fromSocketId === s.id) return
      try { peerInstances.current[fromSocketId]?.signal(signal) } catch (e) { console.warn('[signal]', e) }
    }
    function onPeerLeft({ socketId }: { socketId: string }) {
      try { peerInstances.current[socketId]?.destroy() } catch { /* ignore */ }
      detachMeter(socketId)
      delete peerInstances.current[socketId]
      sfx.play('voice-leave')
      setPeers((cur) => {
        const c = { ...cur }
        delete c[socketId]
        return c
      })
      bump()
    }
    s.on('voice:peer-joined', onPeerJoined)
    s.on('voice:signal', onSignal)
    s.on('voice:peer-left', onPeerLeft)
    return () => {
      s.off('voice:peer-joined', onPeerJoined)
      s.off('voice:signal', onSignal)
      s.off('voice:peer-left', onPeerLeft)
    }
  }, [channelId, buildPeer, detachMeter, bump])

  useEffect(() => () => cleanup(), [cleanup])

  // ── toggles ───────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!micAvailable) {
      // attempt to get real mic instead of toggling a silent placeholder
      requestMic()
      return
    }
    const track = senderTracks.current.audio
    if (!track) return
    track.enabled = !track.enabled
    setMicOn(track.enabled)
    setStoreMicOn(track.enabled)
    sfx.play(track.enabled ? 'unmute' : 'mute')
  }, [micAvailable, requestMic, setStoreMicOn])

  const toggleDeafen = useCallback(() => {
    setDeafened((d) => {
      const next = !d
      const t = senderTracks.current.audio
      if (t && micAvailable) {
        t.enabled = !next
        setMicOn(!next)
        setStoreMicOn(!next)
      }
      setStoreDeafened(next)
      sfx.play(next ? 'mute' : 'undeafen')
      return next
    })
  }, [micAvailable, setStoreDeafened, setStoreMicOn])

  // expose toggles globally while in call
  useEffect(() => {
    if (connected) {
      registerControls(toggleMic, toggleDeafen)
      return () => registerControls(null, null)
    }
  }, [connected, registerControls, toggleMic, toggleDeafen])

  // ── shared video helpers ──────────────────────────────────────────────────
  const stopVideoTrack = useCallback(() => {
    const existing = senderTracks.current.video
    const local = localStreamRef.current
    if (!existing || !local) return
    Object.values(peerInstances.current).forEach((p) => {
      try { (p as PeerExt).removeTrack(existing, local) } catch { /* ignore */ }
    })
    try { local.removeTrack(existing) } catch { /* ignore */ }
    existing.stop()
    senderTracks.current.video = undefined
    setCamOn(false)
    setScreenOn(false)
    bump()
  }, [bump])

  async function startVideo(mode: 'cam' | 'screen') {
    if (!localStreamRef.current) return
    stopVideoTrack()
    let stream: MediaStream
    try {
      stream = mode === 'cam'
        ? await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    } catch (e) {
      const err = e as Error
      console.warn(`[voice] ${mode} getMedia failed:`, err?.name, err?.message)
      return
    }
    const vt = stream.getVideoTracks()[0]
    if (!vt) {
      console.warn(`[voice] ${mode} no video track`)
      return
    }
    senderTracks.current.video = vt
    try { localStreamRef.current.addTrack(vt) } catch (e) { console.warn('[voice] local addTrack', e) }
    Object.values(peerInstances.current).forEach((p) => {
      try { (p as PeerExt).addTrack(vt, localStreamRef.current!) } catch (e) { console.warn('[voice] peer addTrack', e) }
    })
    vt.onended = () => stopVideoTrack()
    if (mode === 'cam') setCamOn(true)
    else setScreenOn(true)
    bump()
  }

  async function toggleCam() {
    if (camOn) { stopVideoTrack(); return }
    await startVideo('cam')
  }
  async function toggleScreen() {
    if (screenOn) { stopVideoTrack(); return }
    await startVideo('screen')
  }

  return {
    connected,
    peers: Object.values(peers),
    micOn, deafened, camOn, screenOn,
    micAvailable, micError,
    error,
    join, leave,
    toggleMic, toggleDeafen, toggleCam, toggleScreen,
    requestMic,
    localStream: localStreamRef.current,
    mediaVer,
  }
}
