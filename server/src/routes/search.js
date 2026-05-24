import { Router } from 'express'
import mongoose from 'mongoose'
import { Message } from '../models/Message.js'
import { Channel } from '../models/Channel.js'
import { Membership } from '../models/Membership.js'
import { User } from '../models/User.js'

export function searchRouter() {
  const r = Router()

  // GET /api/search?q=...&guildId=...
  r.get('/search', async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const q = String(req.query.q || '').trim()
    if (!q) return res.json({ messages: [] })

    const memberships = await Membership.find({ userId }).lean()
    const guildIds = memberships.map((m) => m.guildId)
    const guildFilter = req.query.guildId ? [new mongoose.Types.ObjectId(String(req.query.guildId))] : guildIds
    const channels = await Channel.find({ guildId: { $in: guildFilter }, type: 'text' }).lean()
    const channelIds = channels.map((c) => c._id)
    if (channelIds.length === 0) return res.json({ messages: [] })

    // Use simple regex (more forgiving than $text for substring search)
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const msgs = await Message.find({
      channelId: { $in: channelIds },
      content: re,
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()

    const userIds = [...new Set(msgs.map((m) => m.authorId.toString()))]
    const [users, chMap] = await Promise.all([
      User.find({ _id: { $in: userIds } }).lean(),
      Promise.resolve(Object.fromEntries(channels.map((c) => [c._id.toString(), c]))),
    ])
    const byUser = Object.fromEntries(
      users.map((u) => [u._id.toString(), { id: u._id.toString(), username: u.username, avatarColor: u.avatarColor }]),
    )

    res.json({
      messages: msgs.map((m) => ({
        id: m._id.toString(),
        channelId: m.channelId.toString(),
        channelName: chMap[m.channelId.toString()]?.name || '',
        author: byUser[m.authorId.toString()] || { id: m.authorId.toString(), username: '?', avatarColor: '#888' },
        content: m.content,
        createdAt: m.createdAt,
      })),
    })
  })

  return r
}
