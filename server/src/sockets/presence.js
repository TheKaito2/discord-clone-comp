import { User } from '../models/User.js'
import { Membership } from '../models/Membership.js'
import mongoose from 'mongoose'

// Track online users: userId -> Set<socketId>
const sockets = new Map()

export function wirePresence(io) {
  io.on('connection', async (socket) => {
    const { id: userId } = socket.data.user
    if (!sockets.has(userId)) sockets.set(userId, new Set())
    sockets.get(userId).add(socket.id)

    try {
      await User.updateOne({ _id: userId }, { status: 'online', lastSeenAt: new Date() })
    } catch {}

    const memberships = await Membership.find({ userId: new mongoose.Types.ObjectId(userId) }).lean()
    memberships.forEach((m) => socket.join(`guild:${m.guildId}`))
    socket.broadcast.emit('presence:update', { userId, status: 'online' })

    socket.on('me:status', async (status) => {
      if (!['online', 'idle', 'dnd'].includes(status)) return
      await User.updateOne({ _id: userId }, { status })
      io.emit('presence:update', { userId, status })
    })

    socket.on('disconnect', async () => {
      const set = sockets.get(userId)
      set?.delete(socket.id)
      if (!set || set.size === 0) {
        sockets.delete(userId)
        await User.updateOne({ _id: userId }, { status: 'offline', lastSeenAt: new Date() })
        io.emit('presence:update', { userId, status: 'offline' })
      }
    })
  })
}
