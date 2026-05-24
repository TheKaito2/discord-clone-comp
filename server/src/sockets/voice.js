import { Channel } from '../models/Channel.js'
import { Membership } from '../models/Membership.js'
import mongoose from 'mongoose'

// Tracks voice room membership: roomKey → Map<socketId, { userId, username }>
const voiceRooms = new Map()

function roomKey(channelId) {
  return `voice:${channelId}`
}

export function wireVoice(io) {
  io.on('connection', (socket) => {
    const { id: userId, username } = socket.data.user

    socket.on('voice:join', async ({ channelId }, ack) => {
      try {
        const ch = await Channel.findById(channelId).lean()
        if (!ch || (ch.type !== 'voice' && ch.type !== 'dm')) return ack?.({ ok: false, error: 'Bad channel' })
        if (ch.type === 'dm') {
          if (!ch.participantIds?.some((p) => p.toString() === userId.toString())) {
            return ack?.({ ok: false, error: 'Not a participant' })
          }
          // ring the other participant(s)
          const others = ch.participantIds
            .map((p) => p.toString())
            .filter((id) => id !== userId.toString())
          for (const otherId of others) {
            io.to(`user:${otherId}`).emit('dm:incoming-call', {
              channelId,
              from: { id: userId, username },
            })
          }
        } else {
          const member = await Membership.findOne({
            guildId: ch.guildId,
            userId: new mongoose.Types.ObjectId(userId),
          }).lean()
          if (!member) return ack?.({ ok: false, error: 'Not a member' })
        }

        const key = roomKey(channelId)
        if (!voiceRooms.has(key)) voiceRooms.set(key, new Map())
        const peers = voiceRooms.get(key)
        const peerList = [...peers.entries()].map(([sid, info]) => ({ socketId: sid, ...info }))

        socket.join(key)
        peers.set(socket.id, { userId, username })

        // tell new joiner about existing peers
        ack?.({ ok: true, peers: peerList })
        // tell existing peers about new one
        socket.to(key).emit('voice:peer-joined', { socketId: socket.id, userId, username })
        io.to(key).emit('voice:roster', {
          channelId,
          members: [...peers.entries()].map(([sid, info]) => ({ socketId: sid, ...info })),
        })
      } catch (e) {
        console.error('[voice:join]', e)
        ack?.({ ok: false, error: 'Server error' })
      }
    })

    socket.on('voice:signal', ({ toSocketId, signal }) => {
      io.to(toSocketId).emit('voice:signal', { fromSocketId: socket.id, signal })
    })

    socket.on('voice:leave', ({ channelId }) => leaveVoice(socket, channelId))

    socket.on('disconnect', () => {
      for (const [key, peers] of voiceRooms.entries()) {
        if (peers.has(socket.id)) {
          peers.delete(socket.id)
          socket.to(key).emit('voice:peer-left', { socketId: socket.id, userId })
          io.to(key).emit('voice:roster', {
            channelId: key.replace('voice:', ''),
            members: [...peers.entries()].map(([sid, info]) => ({ socketId: sid, ...info })),
          })
          if (peers.size === 0) voiceRooms.delete(key)
        }
      }
    })

    function leaveVoice(s, channelId) {
      const key = roomKey(channelId)
      const peers = voiceRooms.get(key)
      if (!peers) return
      peers.delete(s.id)
      s.leave(key)
      s.to(key).emit('voice:peer-left', { socketId: s.id, userId })
      io.to(key).emit('voice:roster', {
        channelId,
        members: [...peers.entries()].map(([sid, info]) => ({ socketId: sid, ...info })),
      })
      if (peers.size === 0) voiceRooms.delete(key)
    }
  })
}
