import { useEffect, useRef, useState, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import { getSocket } from '../../lib/socket'
import { useVoiceStore } from '../../store/voice'

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

export function useWebRTC(channelId: string | undefined) {
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState<Record<string, VoicePeer>>({})
  const [micOn, setMicOn] = useState(true)
  const [deafened, setDeafened] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerInstances = useRef<Record<string, SimplePeer.Instance>>({})
  const senderTracks = useRef<{ audio?: MediaStreamTrack; video?: MediaStreamTrack }>({})

  const setActive = useVoiceStore((s) => s.setActive)
  const setSpeaking = useVoiceStore((s) => s.setSpeaking)

  // ── voice-level meter (speaking detection) ────────────────────────────────
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
  }, [])

  useEffect(() => {
    function tick() {
      meters.current.forEach((m) => {
        m.node.getByteFrequencyData(m.data)
        let sum = 0
        for (let i = 0; i < m.data.length; i++) sum += m.data[i]
        const avg = sum / m.data.length
        // threshold tuned for normal voice
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
  }, [setActive])

  // ── peer builder ──────────────────────────────────────────────────────────
  const buildPeer = useCallback(
    (initiator: boolean, target: { socketId: string; userId: string; username: string }) => {
      const stream = localStreamRef.current!
      const peer = new SimplePeer({ initiator, trickle: true, stream })
      peer.on('signal', (signal) => {
        getSocket().emit('voice:signal', { toSocketId: target.socketId, signal })
      })
      peer.on('stream', (remote: MediaStream) => {
        setPeers((s) => ({
          ...s,
          [target.socketId]: { ...(s[target.socketId] || target), stream: remote },
        }))
        attachMeter(target.socketId, remote, target.userId)
      })
      peer.on('error', (e) => console.warn('[peer]', target.username, e?.message))
      peer.on('close', () => {
        detachMeter(target.socketId)
        delete peerInstances.current[target.socketId]
        setPeers((s) => {
          const c = { ...s }
          delete c[target.socketId]
          return c
        })
      })
      peerInstances.current[target.socketId] = peer
      setPeers((s) => ({ ...s, [target.socketId]: { ...target, ...s[target.socketId] } }))
    },
    [attachMeter, detachMeter],
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
        ack.peers.forEach((p) => buildPeer(true, p))
      } catch (e) {
        const err = e as Error
        setError(err?.name === 'NotAllowedError' ? 'Microphone permission denied' : err?.message || 'Could not start voice')
        cleanup()
      }
    },
    [buildPeer, cleanup, setActive, attachMeter],
  )

  const leave = useCallback(() => {
    const s = getSocket()
    if (channelId) s.emit('voice:leave', { channelId })
    cleanup()
  }, [channelId, cleanup])

  // wire socket events
  useEffect(() => {
    if (!channelId) return
    const s = getSocket()
    function onPeerJoined(p: { socketId: string; userId: string; username: string }) {
      if (!localStreamRef.current) return
      buildPeer(false, p)
    }
    function onSignal({ fromSocketId, signal }: { fromSocketId: string; signal: SimplePeer.SignalData }) {
      try { peerInstances.current[fromSocketId]?.signal(signal) } catch (e) { console.warn('[signal]', e) }
    }
    function onPeerLeft({ socketId }: { socketId: string }) {
      try { peerInstances.current[socketId]?.destroy() } catch { /* ignore */ }
      detachMeter(socketId)
      delete peerInstances.current[socketId]
      setPeers((cur) => {
        const c = { ...cur }
        delete c[socketId]
        return c
      })
    }

    s.on('voice:peer-joined', onPeerJoined)
    s.on('voice:signal', onSignal)
    s.on('voice:peer-left', onPeerLeft)
    return () => {
      s.off('voice:peer-joined', onPeerJoined)
      s.off('voice:signal', onSignal)
      s.off('voice:peer-left', onPeerLeft)
    }
  }, [channelId, buildPeer, detachMeter])

  useEffect(() => () => cleanup(), [cleanup])

  // ── toggles ───────────────────────────────────────────────────────────────
  function toggleMic() {
    const track = senderTracks.current.audio
    if (!track) return
    track.enabled = !track.enabled
    setMicOn(track.enabled)
  }

  function toggleDeafen() {
    setDeafened((d) => {
      const next = !d
      // when deafening, also mute mic; un-deafen restores mic to ON
      const t = senderTracks.current.audio
      if (t) {
        if (next) {
          t.enabled = false
          setMicOn(false)
        } else {
          t.enabled = true
          setMicOn(true)
        }
      }
      return next
    })
  }

  type PeerExt = SimplePeer.Instance & {
    addTrack: (t: MediaStreamTrack, s: MediaStream) => void
    removeTrack: (t: MediaStreamTrack, s: MediaStream) => void
    replaceTrack: (o: MediaStreamTrack, n: MediaStreamTrack, s: MediaStream) => void
  }

  async function toggleCam() {
    if (!localStreamRef.current) return
    if (camOn || screenOn) {
      // stop whatever video is active (cam or screen) and clear
      const existing = senderTracks.current.video
      if (existing) {
        Object.values(peerInstances.current).forEach((p) => {
          try { (p as PeerExt).removeTrack(existing, localStreamRef.current!) } catch { /* ignore */ }
        })
        existing.stop()
        senderTracks.current.video = undefined
      }
      setCamOn(false)
      setScreenOn(false)
      if (camOn) return
    }
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
      const vt = cam.getVideoTracks()[0]
      senderTracks.current.video = vt
      localStreamRef.current.addTrack(vt)
      Object.values(peerInstances.current).forEach((p) => {
        try { (p as PeerExt).addTrack(vt, localStreamRef.current!) } catch (e) { console.warn('addTrack', e) }
      })
      vt.onended = () => {
        setCamOn(false)
        senderTracks.current.video = undefined
      }
      setCamOn(true)
    } catch (e) { console.warn('[voice] camera denied', e) }
  }

  async function toggleScreen() {
    if (!localStreamRef.current) return
    if (screenOn) {
      const existing = senderTracks.current.video
      if (existing) {
        Object.values(peerInstances.current).forEach((p) => {
          try { (p as PeerExt).removeTrack(existing, localStreamRef.current!) } catch { /* ignore */ }
        })
        existing.stop()
        senderTracks.current.video = undefined
      }
      setScreenOn(false)
      setCamOn(false)
      return
    }
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const vt = ss.getVideoTracks()[0]
      const existing = senderTracks.current.video
      if (existing) {
        // replace existing video track (e.g. cam) with screen share
        Object.values(peerInstances.current).forEach((p) => {
          try { (p as PeerExt).replaceTrack(existing, vt, localStreamRef.current!) } catch (e) { console.warn('replaceTrack', e) }
        })
        existing.stop()
      } else {
        localStreamRef.current.addTrack(vt)
        Object.values(peerInstances.current).forEach((p) => {
          try { (p as PeerExt).addTrack(vt, localStreamRef.current!) } catch (e) { console.warn('addTrack', e) }
        })
      }
      senderTracks.current.video = vt
      vt.onended = () => {
        // user clicked browser "stop sharing"
        Object.values(peerInstances.current).forEach((p) => {
          try { (p as PeerExt).removeTrack(vt, localStreamRef.current!) } catch { /* ignore */ }
        })
        senderTracks.current.video = undefined
        setScreenOn(false)
        setCamOn(false)
      }
      setScreenOn(true)
      setCamOn(false)
    } catch (e) { console.warn('[voice] screen denied', e) }
  }

  return {
    connected,
    peers: Object.values(peers),
    micOn, deafened, camOn, screenOn,
    error,
    join, leave,
    toggleMic, toggleDeafen, toggleCam, toggleScreen,
    localStream: localStreamRef.current,
  }
}
