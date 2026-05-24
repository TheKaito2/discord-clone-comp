import { Router } from 'express'
import mongoose from 'mongoose'
import { Guild } from '../models/Guild.js'
import { Channel } from '../models/Channel.js'
import { Membership } from '../models/Membership.js'
import { User } from '../models/User.js'

export function guildsRouter() {
  const r = Router()

  // GET /api/me/guilds — all guilds (with channels) the current user is in
  r.get('/me/guilds', async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const memberships = await Membership.find({ userId }).lean()
    const guildIds = memberships.map((m) => m.guildId)
    const [guilds, channels] = await Promise.all([
      Guild.find({ _id: { $in: guildIds } }).lean(),
      Channel.find({ guildId: { $in: guildIds } }).sort({ position: 1 }).lean(),
    ])
    const byGuild = new Map()
    channels.forEach((c) => {
      const k = c.guildId.toString()
      if (!byGuild.has(k)) byGuild.set(k, [])
      byGuild.get(k).push(c)
    })
    res.json(
      guilds.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        iconUrl: g.iconUrl,
        bannerUrl: g.bannerUrl,
        inviteCode: g.inviteCode,
        ownerId: g.ownerId?.toString(),
        channels: (byGuild.get(g._id.toString()) || []).map((c) => ({
          id: c._id.toString(),
          name: c.name,
          type: c.type,
          category: c.category,
          topic: c.topic,
          position: c.position,
        })),
      })),
    )
  })

  // GET /api/guilds/:id/members
  r.get('/guilds/:id/members', async (req, res) => {
    const guildId = req.params.id
    const ms = await Membership.find({ guildId }).lean()
    const users = await User.find({ _id: { $in: ms.map((m) => m.userId) } }).lean()
    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        avatarColor: u.avatarColor,
        status: u.status,
      })),
    )
  })

  return r
}
