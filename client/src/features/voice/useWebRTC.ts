import { useEffect, useRef, useState, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import { getSocket } from '../../lib/socket'

export type VoicePeer = {
  socketId: string
  userId: string
  username: string
  stream?: MediaStream
}

type JoinAck =
  | { ok: false; error: string }
  | { ok: true; peers: { socketId: string; userId: string; username: string }[] }

export function useWebRTC(channelId: string | undefined) {
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState<Record<string, VoicePeer>>({})
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerInstances = useRef<Record<string, SimplePeer.Instance>>({})
  const camStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const senderTracks = useRef<{ audio?: MediaStreamTrack; video?: MediaStreamTrack }>({})

  const cleanup = useCallback(() => {
    Object.values(peerInstances.current).forEach((p) => p.destroy())
    peerInstances.current = {}
    setPeers({})
    setConnected(false)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop())
      camStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }
  }, [])

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
      })
      peer.on('error', (e) => {
        console.warn('[peer]', target.username, e?.message)
      })
      peer.on('close', () => {
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
    [],
  )

  const join = useCallback(
    async (chId: string) => {
      try {
        // mic first; video toggled separately
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        localStreamRef.current = stream
        senderTracks.current.audio = stream.getAudioTracks()[0]

        const s = getSocket()
        const ack: JoinAck = await new Promise((resolve) => {
          s.emit('voice:join', { channelId: chId }, resolve)
        })
        if (!ack.ok) {
          console.warn('[voice] join failed', ack.error)
          cleanup()
          return
        }
        setConnected(true)
        // existing peers — initiator
        ack.peers.forEach((p) => buildPeer(true, p))
      } catch (e) {
        console.error('[voice] mic denied', e)
        cleanup()
        throw e
      }
    },
    [buildPeer, cleanup],
  )

  const leave = useCallback(() => {
    const s = getSocket()
    if (channelId) s.emit('voice:leave', { channelId })
    cleanup()
  }, [channelId, cleanup])

  // wire events while connected
  useEffect(() => {
    if (!channelId) return
    const s = getSocket()
    function onPeerJoined(p: { socketId: string; userId: string; username: string }) {
      if (!localStreamRef.current) return
      // non-initiator
      buildPeer(false, p)
    }
    function onSignal({ fromSocketId, signal }: { fromSocketId: string; signal: SimplePeer.SignalData }) {
      peerInstances.current[fromSocketId]?.signal(signal)
    }
    function onPeerLeft({ socketId }: { socketId: string }) {
      peerInstances.current[socketId]?.destroy()
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
  }, [channelId, buildPeer])

  // cleanup if channel changes or unmount
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  function toggleMic() {
    const track = senderTracks.current.audio
    if (!track) return
    track.enabled = !track.enabled
    setMicOn(track.enabled)
  }

  async function toggleCam() {
    if (camOn) {
      // stop cam
      camStreamRef.current?.getTracks().forEach((t) => t.stop())
      camStreamRef.current = null
      const t = senderTracks.current.video
      if (t) {
        Object.values(peerInstances.current).forEach((p) => {
          try { (p as unknown as { removeTrack: (t: MediaStreamTrack, s: MediaStream) => void }).removeTrack(t, localStreamRef.current!) } catch { /* ignore */ }
        })
      }
      senderTracks.current.video = undefined
      setCamOn(false)
    } else {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true })
        camStreamRef.current = cam
        const vt = cam.getVideoTracks()[0]
        senderTracks.current.video = vt
        Object.values(peerInstances.current).forEach((p) => {
          try {
            ;(p as unknown as { addTrack: (t: MediaStreamTrack, s: MediaStream) => void }).addTrack(vt, localStreamRef.current!)
          } catch (e) { console.warn('addTrack', e) }
        })
        setCamOn(true)
      } catch (e) { console.error('[voice] camera denied', e) }
    }
  }

  async function toggleScreen() {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
      setScreenOn(false)
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = ss
        const vt = ss.getVideoTracks()[0]
        // replace existing camera video track with screen, or add screen track
        const existing = senderTracks.current.video
        Object.values(peerInstances.current).forEach((p) => {
          try {
            if (existing) {
              ;(p as unknown as { replaceTrack: (o: MediaStreamTrack, n: MediaStreamTrack, s: MediaStream) => void }).replaceTrack(
                existing,
                vt,
                localStreamRef.current!,
              )
            } else {
              ;(p as unknown as { addTrack: (t: MediaStreamTrack, s: MediaStream) => void }).addTrack(vt, localStreamRef.current!)
            }
          } catch (e) { console.warn('share', e) }
        })
        senderTracks.current.video = vt
        vt.onended = () => {
          setScreenOn(false)
          screenStreamRef.current = null
        }
        setScreenOn(true)
      } catch (e) { console.warn('[voice] screen denied', e) }
    }
  }

  return {
    connected,
    peers: Object.values(peers),
    micOn, camOn, screenOn,
    join, leave,
    toggleMic, toggleCam, toggleScreen,
    localStream: localStreamRef.current,
  }
}
