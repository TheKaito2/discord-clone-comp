import { Router } from 'express'
import mongoose from 'mongoose'
import { Channel } from '../models/Channel.js'
import { Message } from '../models/Message.js'
import { User } from '../models/User.js'

function pairKey(a, b) {
  return [a.toString(), b.toString()].sort().join(':')
}

export function dmsRouter() {
  const r = Router()

  // POST /api/dms { userId } — find or create DM channel between me and userId
  r.post('/dms', async (req, res) => {
    const me = new mongoose.Types.ObjectId(req.user.id)
    const otherId = req.body?.userId
    if (!otherId || !mongoose.isValidObjectId(otherId)) {
      return res.status(400).json({ error: 'Bad userId' })
    }
    if (otherId === req.user.id) return res.status(400).json({ error: 'Cannot DM yourself' })

    const other = await User.findById(otherId).lean()
    if (!other) return res.status(404).json({ error: 'User not found' })

    const key = pairKey(req.user.id, otherId)
    let ch = await Channel.findOne({ type: 'dm', pairKey: key }).lean()
    if (!ch) {
      const created = await Channel.create({
        type: 'dm',
        guildId: null,
        participantIds: [me, new mongoose.Types.ObjectId(otherId)],
        pairKey: key,
        name: '',
      })
      ch = created.toObject()
    }

    res.json({
      id: ch._id.toString(),
      type: 'dm',
      other: {
        id: other._id.toString(),
        username: other.username,
        displayName: other.displayName || '',
        avatarColor: other.avatarColor,
        avatarUrl: other.avatarUrl || '',
        status: other.status,
      },
      createdAt: ch.createdAt,
    })
  })

  // GET /api/me/dms — list DM channels with last message + other user
  r.get('/me/dms', async (req, res) => {
    const me = new mongoose.Types.ObjectId(req.user.id)
    const chans = await Channel.find({ type: 'dm', participantIds: me }).lean()
    if (!chans.length) return res.json([])

    const otherIds = chans
      .map((c) => c.participantIds.find((p) => p.toString() !== req.user.id))
      .filter(Boolean)
    const users = await User.find({ _id: { $in: otherIds } }).lean()
    const byId = new Map(users.map((u) => [u._id.toString(), u]))

    const lastMsgs = await Message.aggregate([
      { $match: { channelId: { $in: chans.map((c) => c._id) } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$channelId', last: { $first: '$$ROOT' } } },
    ])
    const lastByCh = new Map(lastMsgs.map((m) => [m._id.toString(), m.last]))

    res.json(
      chans
        .map((c) => {
          const otherId = c.participantIds.find((p) => p.toString() !== req.user.id)?.toString()
          const o = byId.get(otherId)
          if (!o) return null
          const last = lastByCh.get(c._id.toString())
          return {
            id: c._id.toString(),
            type: 'dm',
            other: {
              id: o._id.toString(),
              username: o.username,
              displayName: o.displayName || '',
              avatarColor: o.avatarColor,
              avatarUrl: o.avatarUrl || '',
              status: o.status,
            },
            lastMessageAt: last?.createdAt || c.createdAt,
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)),
    )
  })

  // DELETE /api/dms/:id — close (remove me from participants; if empty drop channel)
  r.delete('/dms/:id', async (req, res) => {
    const me = new mongoose.Types.ObjectId(req.user.id)
    const ch = await Channel.findOne({ _id: req.params.id, type: 'dm', participantIds: me })
    if (!ch) return res.status(404).json({ error: 'Not found' })
    ch.participantIds = ch.participantIds.filter((p) => p.toString() !== req.user.id)
    if (ch.participantIds.length === 0) {
      await Message.deleteMany({ channelId: ch._id })
      await ch.deleteOne()
    } else {
      await ch.save()
    }
    res.json({ ok: true })
  })

  return r
}
