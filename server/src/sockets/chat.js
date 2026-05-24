import mongoose from 'mongoose'
import { Message } from '../models/Message.js'
import { Channel } from '../models/Channel.js'
import { Membership } from '../models/Membership.js'
import { User } from '../models/User.js'

export function wireChat(io) {
  io.on('connection', (socket) => {
    const { id: userId, username } = socket.data.user

    socket.on('channel:join', async (channelId) => {
      try {
        const ch = await Channel.findById(channelId).lean()
        if (!ch) return
        if (ch.type === 'dm') {
          if (!ch.participantIds?.some((p) => p.toString() === userId.toString())) return
        } else {
          const member = await Membership.findOne({ guildId: ch.guildId, userId }).lean()
          if (!member) return
        }
        for (const room of socket.rooms) {
          if (typeof room === 'string' && room.startsWith('chan:')) socket.leave(room)
        }
        socket.join(`chan:${channelId}`)
      } catch (e) {
        console.error('[chan:join]', e)
      }
    })

    socket.on('channel:leave', (channelId) => {
      socket.leave(`chan:${channelId}`)
    })

    socket.on('message:create', async ({ channelId, content, tempId }, ack) => {
      try {
        const trimmed = String(content || '').trim()
        if (!trimmed) return ack?.({ ok: false, error: 'Empty' })
        const ch = await Channel.findById(channelId).lean()
        if (!ch || (ch.type !== 'text' && ch.type !== 'dm')) return ack?.({ ok: false, error: 'Bad channel' })
        if (ch.type === 'dm') {
          if (!ch.participantIds?.some((p) => p.toString() === userId.toString())) {
            return ack?.({ ok: false, error: 'Not a participant' })
          }
        } else {
          const member = await Membership.findOne({
            guildId: ch.guildId,
            userId: new mongoose.Types.ObjectId(userId),
          }).lean()
          if (!member) return ack?.({ ok: false, error: 'Not a member' })
        }

        const author = await User.findById(userId).lean()
        const msg = await Message.create({
          channelId: ch._id,
          authorId: userId,
          content: trimmed,
        })
        const payload = {
          id: msg._id.toString(),
          channelId: msg.channelId.toString(),
          author: {
            id: userId,
            username,
            avatarColor: author?.avatarColor || '#888',
            avatarUrl: author?.avatarUrl || '',
          },
          content: msg.content,
          createdAt: msg.createdAt,
          editedAt: null,
          tempId: tempId || null,
        }
        io.to(`chan:${channelId}`).emit('message:new', payload)
        ack?.({ ok: true, message: payload })
      } catch (e) {
        console.error('[message:create]', e)
        ack?.({ ok: false, error: 'Server error' })
      }
    })
  })
}
