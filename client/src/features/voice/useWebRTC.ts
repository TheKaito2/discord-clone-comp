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

export function useWebRTC(channelId: string | undefined) {
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState<Record<string, VoicePeer>>({})
  const [micOn, setMicOn] = useState(true)
  const [deafened, setDeafened] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const stream = localStreamRef.current!
      const peer = new SimplePeer({ initiator, trickle: true, stream })

      const onRemoteStream = (remote: MediaStream) => {
        setPeers((s) => ({
          ...s,
          [target.socketId]: { ...(s[target.socketId] || target), stream: remote },
        }))
        attachMeter(target.socketId, remote, target.userId)
        bump()
        // when the remote's video track gets added/removed later, simple-peer
        // fires onremovetrack/onaddtrack on the stream itself
        remote.onaddtrack = () => bump()
        remote.onremovetrack = () => bump()
      }

      peer.on('signal', (signal: SignalData) => {
        getSocket().emit('voice:signal', { toSocketId: target.socketId, signal })
      })
      peer.on('stream', onRemoteStream)
      // simple-peer ≥9 fires per-track event so we know new tracks arrived after
      // initial negotiation (e.g. when a peer turns on camera/screen share later)
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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
          video: false,
        })
        localStreamRef.current = stream
        senderTracks.current.audio = stream.getAudioTracks()[0]
        attachMeter('self', stream, 'self')

        const s = getSocket()
        const ack: JoinAck = await new Promise((resolve) => {
          s.emit('voice:join', { channelId: chId }, resolve)
        })
        if (!ack.ok) {
          cleanup()
          setError(ack.error || 'Could not join')
          return
        }
        setConnected(true)
        setActive(chId)
        sfx.play(ack.peers.length === 0 ? 'outgoing' : 'voice-join')
        ack.peers.forEach((p) => buildPeer(true, p))
        bump()
      } catch (e) {
        const err = e as Error
        setError(err?.name === 'NotAllowedError' ? 'Microphone permission denied' : err?.message || 'Could not start voice')
        cleanup()
      }
    },
    [buildPeer, cleanup, setActive, attachMeter, bump],
  )

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
      if (!localStreamRef.current) return
      sfx.play('voice-join')
      buildPeer(false, p)
    }
    function onSignal({ fromSocketId, signal }: { fromSocketId: string; signal: SignalData }) {
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
    const track = senderTracks.current.audio
    if (!track) return
    track.enabled = !track.enabled
    setMicOn(track.enabled)
    setStoreMicOn(track.enabled)
    sfx.play(track.enabled ? 'unmute' : 'mute')
  }, [setStoreMicOn])

  const toggleDeafen = useCallback(() => {
    setDeafened((d) => {
      const next = !d
      const t = senderTracks.current.audio
      if (t) {
        t.enabled = !next
        setMicOn(!next)
        setStoreMicOn(!next)
      }
      setStoreDeafened(next)
      sfx.play(next ? 'mute' : 'undeafen')
      return next
    })
  }, [setStoreDeafened, setStoreMicOn])

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
    // stop whatever is currently active first
    stopVideoTrack()
    try {
      const stream = mode === 'cam'
        ? await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const vt = stream.getVideoTracks()[0]
      if (!vt) return
      senderTracks.current.video = vt
      localStreamRef.current.addTrack(vt)
      Object.values(peerInstances.current).forEach((p) => {
        try { (p as PeerExt).addTrack(vt, localStreamRef.current!) } catch (e) { console.warn('addTrack', e) }
      })
      vt.onended = () => stopVideoTrack()
      if (mode === 'cam') setCamOn(true)
      else setScreenOn(true)
      bump()
    } catch (e) {
      console.warn(`[voice] ${mode} denied`, e)
      const err = e as Error
      if (err?.name !== 'NotAllowedError') setError(`${mode === 'cam' ? 'Camera' : 'Screen share'} failed`)
    }
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
    error,
    join, leave,
    toggleMic, toggleDeafen, toggleCam, toggleScreen,
    localStream: localStreamRef.current,
    mediaVer,
  }
}
