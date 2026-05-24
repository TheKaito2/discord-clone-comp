import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff, Volume2 } from 'lucide-react'
import { useWebRTC, type VoicePeer } from './useWebRTC'
import { useAuthStore } from '../../store/auth'

export default function VoicePanel({ channelId, channelName }: { channelId: string; channelName: string }) {
  const me = useAuthStore((s) => s.user)
  const rtc = useWebRTC(channelId)
  const joinedRef = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // auto-join on mount (once per channel)
  useEffect(() => {
    if (joinedRef.current === channelId) return
    joinedRef.current = channelId
    setError(null)
    rtc.join(channelId).catch((e: Error) => {
      setError(e?.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Could not start voice')
    })
    return () => {
      rtc.leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-bg-grad to-bg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 size={18} className="text-text-sub" />
        <span className="text-text-hi font-semibold">{channelName}</span>
        <span className="ml-3 text-xs text-text-sub">
          {error ? <span className="text-danger">{error}</span> : rtc.connected ? `Voice connected — ${rtc.peers.length + 1} in room` : 'Connecting…'}
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
        {/* local tile */}
        <Tile
          stream={rtc.localStream}
          muted
          peer={{
            socketId: 'self',
            userId: me?.id || 'self',
            username: (me?.username || 'You') + ' (you)',
          }}
          isYou
        />
        {rtc.peers.map((p) => (
          <Tile key={p.socketId} peer={p} stream={p.stream} />
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <ToolbarBtn label={rtc.micOn ? 'Mute' : 'Unmute'} onClick={rtc.toggleMic} on={rtc.micOn}>
          {rtc.micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </ToolbarBtn>
        <ToolbarBtn label={rtc.camOn ? 'Stop video' : 'Start video'} onClick={rtc.toggleCam} on={rtc.camOn}>
          {rtc.camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </ToolbarBtn>
        <ToolbarBtn label={rtc.screenOn ? 'Stop share' : 'Share screen'} onClick={rtc.toggleScreen} on={rtc.screenOn}>
          {rtc.screenOn ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
        </ToolbarBtn>
        <button
          onClick={rtc.leave}
          className="h-10 w-10 grid place-items-center rounded-full bg-danger text-white hover:bg-err-bright"
          title="Disconnect"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  )
}

function ToolbarBtn({
  children,
  on,
  label,
  onClick,
}: {
  children: React.ReactNode
  on: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={
        'h-10 w-10 grid place-items-center rounded-full transition-colors ' +
        (on ? 'bg-[#3F4147] text-text-hi hover:bg-[#4E5058]' : 'bg-danger text-white hover:bg-err-bright')
      }
    >
      {children}
    </button>
  )
}

function Tile({
  peer,
  stream,
  muted,
  isYou,
}: {
  peer: VoicePeer
  stream?: MediaStream | null
  muted?: boolean
  isYou?: boolean
}) {
  const vref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (vref.current && stream) {
      vref.current.srcObject = stream
    }
  }, [stream])

  const hasVideo = !!stream?.getVideoTracks().some((t) => t.enabled !== false && t.readyState === 'live')

  return (
    <div className="relative bg-[#2B2D31] rounded-lg aspect-video overflow-hidden flex items-center justify-center">
      {hasVideo ? (
        <video
          ref={vref}
          muted={!!muted}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto grid place-items-center text-3xl font-bold text-white"
            style={{ background: '#5865F2' }}
          >
            {peer.username?.[0]?.toUpperCase()}
          </div>
        </div>
      )}
      {/* hidden audio for non-video remote */}
      {!hasVideo && stream && !muted && (
        <audio
          ref={(el) => {
            if (el && el.srcObject !== stream) el.srcObject = stream
          }}
          autoPlay
        />
      )}
      <div className="absolute bottom-2 left-2 right-2 bg-black/60 rounded px-2 py-1 text-xs text-text-hi flex items-center gap-1">
        <span className="truncate">{peer.username}</span>
        {isYou && <span className="text-text-sub ml-auto">you</span>}
      </div>
    </div>
  )
}
