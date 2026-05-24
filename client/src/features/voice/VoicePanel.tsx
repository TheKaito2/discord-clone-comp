import { useEffect, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff, Headphones, HeadphoneOff, Settings as SettingsIcon, Activity } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWebRTC, type VoicePeer } from './useWebRTC'
import { useAuthStore } from '../../store/auth'
import { useVoiceStore } from '../../store/voice'
import { useGuilds, useMembers } from '../../lib/queries'
import Avatar from '../../components/Avatar'
import clsx from 'clsx'

export default function VoicePanel({ channelId, channelName }: { channelId: string; channelName: string }) {
  const me = useAuthStore((s) => s.user)
  const rtc = useWebRTC(channelId)
  const joinedRef = useRef<string | null>(null)
  const speaking = useVoiceStore((s) => s.speakingUsers)
  const { guildId } = useParams()
  const nav = useNavigate()
  const guilds = useGuilds()
  const members = useMembers(guildId)
  const memberByUserId = (members.data || []).reduce<Record<string, { avatarUrl?: string; avatarColor: string }>>((acc, m) => {
    acc[m.id] = { avatarUrl: m.avatarUrl, avatarColor: m.avatarColor }
    return acc
  }, {})

  useEffect(() => {
    if (joinedRef.current === channelId) return
    joinedRef.current = channelId
    rtc.join(channelId)
    return () => {
      rtc.leave()
      joinedRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  function handleLeave() {
    rtc.leave()
    joinedRef.current = null
    if (guildId) {
      const g = guilds.data?.find((x) => x.id === guildId)
      const firstText = g?.channels.find((c) => c.type === 'text')
      nav(firstText ? `/app/${guildId}/${firstText.id}` : `/app/${guildId}`, { replace: true })
    } else {
      nav('/app/home', { replace: true })
    }
  }

  const tileCount = rtc.peers.length + 1
  const cols = tileCount <= 1 ? 1 : tileCount <= 4 ? 2 : 3

  return (
    <div className="flex-1 flex flex-col bg-[#1E1F22] min-h-0 relative overflow-hidden">
      {/* Stage */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 gap-2">
        {rtc.error ? (
          /* Room-level failure (not mic) — block */
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-danger/20 grid place-items-center">
              <MicOff size={36} className="text-danger" />
            </div>
            <div className="text-[20px] font-bold text-text-hi mb-2">{rtc.error}</div>
            <p className="text-text-mute text-[14px] mb-4">Could not join voice channel.</p>
            <button
              onClick={handleLeave}
              className="bg-rail hover:bg-hover-a text-text-hi px-4 h-9 rounded text-[14px] font-medium"
            >
              Leave
            </button>
          </div>
        ) : !rtc.connected ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-online/20 grid place-items-center animate-pulse">
              <Activity size={36} className="text-online" />
            </div>
            <div className="text-[16px] font-semibold text-text-hi">Connecting to voice…</div>
            <div className="text-text-mute text-[13px] mt-1">#{channelName}</div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col gap-2">
            {/* Mic unavailable inline banner */}
            {rtc.micError && !rtc.micAvailable && (
              <div className="shrink-0 mx-auto w-full max-w-lg bg-idle/15 border border-idle/30 rounded-lg px-4 py-2.5 flex items-center gap-3">
                <MicOff size={16} className="text-idle shrink-0" />
                <span className="text-[13px] text-idle flex-1">Microphone unavailable — you can still hear others.</span>
                <button
                  onClick={rtc.requestMic}
                  className="text-[12px] font-semibold text-idle hover:text-text-hi bg-idle/20 hover:bg-idle/30 px-3 h-7 rounded transition-colors shrink-0"
                >
                  Enable mic
                </button>
              </div>
            )}

            <div
              className="flex-1 grid gap-2 place-content-center"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                maxWidth: cols === 1 ? 720 : cols === 2 ? 1100 : 1400,
                margin: '0 auto',
                width: '100%',
              }}
            >
              <Tile
                key="self"
                stream={rtc.localStream}
                mediaVer={rtc.mediaVer}
                muted
                speaking={speaking.has('self') && rtc.micOn}
                micOff={!rtc.micAvailable || !rtc.micOn}
                screen={rtc.screenOn}
                peer={{
                  socketId: 'self',
                  userId: me?.id || 'self',
                  username: me?.username || 'You',
                }}
                avatarColor={me?.avatarColor}
                avatarUrl={me?.avatarUrl}
                isYou
              />
              {rtc.peers.map((p) => (
                <Tile
                  key={p.socketId}
                  peer={p}
                  stream={p.stream}
                  mediaVer={rtc.mediaVer}
                  speaking={speaking.has(p.userId)}
                  deafened={rtc.deafened}
                  avatarColor={memberByUserId[p.userId]?.avatarColor}
                  avatarUrl={memberByUserId[p.userId]?.avatarUrl}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom control rail — Discord style pill */}
      {rtc.connected && (
        <div className="shrink-0 px-4 pb-5 pt-2 flex justify-center">
          <div className="bg-[#232428] rounded-full px-2 py-1.5 flex items-center gap-1 shadow-elev1">
            <CtrlBtn
              title={rtc.camOn ? 'Stop video' : 'Start video'}
              onClick={rtc.toggleCam}
              active={rtc.camOn}
            >
              {rtc.camOn ? <Video size={20} /> : <VideoOff size={20} />}
            </CtrlBtn>
            <CtrlBtn
              title={rtc.screenOn ? 'Stop sharing' : 'Share your screen'}
              onClick={rtc.toggleScreen}
              active={rtc.screenOn}
            >
              {rtc.screenOn ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
            </CtrlBtn>
            <div className="w-px h-6 bg-divider/60 mx-1" />
            <CtrlBtn
              title={!rtc.micAvailable ? 'Enable microphone' : rtc.micOn ? 'Mute' : 'Unmute'}
              onClick={rtc.toggleMic}
              danger={!rtc.micAvailable || !rtc.micOn}
            >
              {rtc.micAvailable && rtc.micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </CtrlBtn>
            <CtrlBtn
              title={rtc.deafened ? 'Undeafen' : 'Deafen'}
              onClick={rtc.toggleDeafen}
              danger={rtc.deafened}
            >
              {rtc.deafened ? <HeadphoneOff size={20} /> : <Headphones size={20} />}
            </CtrlBtn>
            <CtrlBtn title="Settings" onClick={() => {}}>
              <SettingsIcon size={20} />
            </CtrlBtn>
            <div className="w-px h-6 bg-divider/60 mx-1" />
            <button
              onClick={handleLeave}
              title="Disconnect"
              className="h-10 w-10 grid place-items-center rounded-full bg-danger hover:bg-err-bright text-white transition-colors"
            >
              <PhoneOff size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CtrlBtn({
  children,
  title,
  onClick,
  active,
  danger,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'h-10 w-10 grid place-items-center rounded-full transition-colors',
        danger
          ? 'bg-danger/15 text-danger hover:bg-danger/25'
          : active
            ? 'bg-text-hi text-bg hover:bg-text-mute'
            : 'text-text-mute hover:bg-hover-a hover:text-text-hi',
      )}
    >
      {children}
    </button>
  )
}

function Tile({
  peer,
  stream,
  mediaVer,
  muted,
  isYou,
  speaking,
  micOff,
  deafened,
  screen,
  avatarColor,
  avatarUrl,
}: {
  peer: VoicePeer
  stream?: MediaStream | null
  mediaVer: number
  muted?: boolean
  isYou?: boolean
  speaking?: boolean
  micOff?: boolean
  deafened?: boolean
  screen?: boolean
  avatarColor?: string
  avatarUrl?: string
}) {
  const vref = useRef<HTMLVideoElement>(null)
  const aref = useRef<HTMLAudioElement>(null)

  const liveVideo = stream?.getVideoTracks().find((t) => t.readyState === 'live' && t.enabled !== false)
  const hasVideo = !!liveVideo
  const trackId = liveVideo?.id

  useEffect(() => {
    const el = vref.current
    if (!el || !stream) return
    el.srcObject = null
    el.srcObject = stream
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }, [stream, trackId, mediaVer, hasVideo])

  useEffect(() => {
    const el = aref.current
    if (!el || !stream) return
    el.srcObject = null
    el.srcObject = stream
    el.muted = !!deafened || !!muted
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }, [stream, deafened, muted, mediaVer])

  return (
    <div
      className={clsx(
        'relative rounded-lg overflow-hidden grid place-items-center transition-shadow',
        'min-h-[180px] aspect-video bg-[#000000]',
        speaking && 'ring-2 ring-online shadow-[0_0_0_2px_rgba(35,165,89,0.4)]',
        !speaking && 'ring-1 ring-rail',
      )}
    >
      {hasVideo ? (
        <video
          ref={vref}
          muted={!!muted}
          autoPlay
          playsInline
          className={clsx(
            'w-full h-full',
            screen ? 'object-contain bg-black' : 'object-cover',
          )}
        />
      ) : (
        <div className="grid place-items-center">
          <Avatar
            username={peer.username}
            avatarColor={avatarColor}
            avatarUrl={avatarUrl}
            size={88}
            className="shadow-elev1 text-4xl"
          />
        </div>
      )}

      {/* hidden remote audio */}
      {stream && !muted && <audio ref={aref} autoPlay />}

      {/* bottom label */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 pointer-events-none">
        <div className="bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1.5 text-[13px] text-text-hi font-medium max-w-full">
          {micOff && <MicOff size={12} className="text-danger shrink-0" />}
          {!micOff && speaking && <span className="w-1.5 h-1.5 rounded-full bg-online shrink-0" />}
          <span className="truncate">{peer.username}{isYou && ' (you)'}</span>
        </div>
        {screen && (
          <div className="bg-online/90 rounded px-1.5 py-0.5 text-[11px] text-white font-semibold">
            LIVE
          </div>
        )}
      </div>
    </div>
  )
}
