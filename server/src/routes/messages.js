import { Router } from 'express'
import mongoose from 'mongoose'
import { Message } from '../models/Message.js'
import { Channel } from '../models/Channel.js'
import { Membership } from '../models/Membership.js'
import { User } from '../models/User.js'

export function messagesRouter() {
  const r = Router()

  // helper — ensure user is member of channel's guild
  async function userCanAccessChannel(userId, channelId) {
    const ch = await Channel.findById(channelId).lean()
    if (!ch) return null
    const m = await Membership.findOne({ guildId: ch.guildId, userId }).lean()
    return m ? ch : null
  }

  // GET /api/channels/:id/messages?before=<iso>&limit=30
  r.get('/channels/:id/messages', async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const ch = await userCanAccessChannel(userId, req.params.id)
    if (!ch) return res.status(404).json({ error: 'Channel not found' })

    const limit = Math.min(Number(req.query.limit) || 30, 100)
    const before = req.query.before ? new Date(String(req.query.before)) : null
    const query = { channelId: ch._id }
    if (before) query.createdAt = { $lt: before }

    const msgs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const userIds = [...new Set(msgs.map((m) => m.authorId.toString()))]
    const users = await User.find({ _id: { $in: userIds } }).lean()
    const byUser = Object.fromEntries(
      users.map((u) => [u._id.toString(), { id: u._id.toString(), username: u.username, avatarColor: u.avatarColor }]),
    )

    res.json(
      msgs.reverse().map((m) => ({
        id: m._id.toString(),
        channelId: m.channelId.toString(),
        author: byUser[m.authorId.toString()] || { id: m.authorId.toString(), username: '?', avatarColor: '#888' },
        content: m.content,
        editedAt: m.editedAt,
        createdAt: m.createdAt,
      })),
    )
  })

  // PATCH /api/messages/:id
  r.patch('/messages/:id', async (req, res) => {
    const userId = req.user.id
    const msg = await Message.findById(req.params.id)
    if (!msg) return res.status(404).json({ error: 'Not found' })
    if (msg.authorId.toString() !== userId) return res.status(403).json({ error: 'Not your message' })
    const content = String(req.body?.content || '').trim()
    if (!content) return res.status(400).json({ error: 'Empty' })
    msg.content = content
    msg.editedAt = new Date()
    await msg.save()
    const io = req.app.get('io')
    io?.to(`chan:${msg.channelId}`).emit('message:updated', {
      id: msg._id.toString(),
      channelId: msg.channelId.toString(),
      content: msg.content,
      editedAt: msg.editedAt,
    })
    res.json({ ok: true })
  })

  // DELETE /api/messages/:id
  r.delete('/messages/:id', async (req, res) => {
    const userId = req.user.id
    const msg = await Message.findById(req.params.id)
    if (!msg) return res.status(404).json({ error: 'Not found' })
    if (msg.authorId.toString() !== userId) return res.status(403).json({ error: 'Not your message' })
    const channelId = msg.channelId.toString()
    const id = msg._id.toString()
    await msg.deleteOne()
    const io = req.app.get('io')
    io?.to(`chan:${channelId}`).emit('message:deleted', { id, channelId })
    res.json({ ok: true })
  })

  return r
}
