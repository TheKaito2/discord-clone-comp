import { Router } from 'express'
import { Guild } from '../models/Guild.js'
import { Channel } from '../models/Channel.js'
import { Membership } from '../models/Membership.js'
import { User } from '../models/User.js'

export function discoverRouter() {
  const r = Router()

  // GET /api/discover/guilds — public list with member counts
  r.get('/discover/guilds', async (_req, res) => {
    const guilds = await Guild.find({}).lean()
    const counts = await Membership.aggregate([
      { $group: { _id: '$guildId', n: { $sum: 1 } } },
    ])
    const countMap = Object.fromEntries(
      counts.filter((c) => c._id).map((c) => [c._id.toString(), c.n]),
    )
    const channelCounts = await Channel.aggregate([
      { $group: { _id: '$guildId', n: { $sum: 1 } } },
    ])
    const chanMap = Object.fromEntries(
      channelCounts.filter((c) => c._id).map((c) => [c._id.toString(), c.n]),
    )
    res.json(
      guilds.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        inviteCode: g.inviteCode,
        iconUrl: g.iconUrl,
        bannerUrl: g.bannerUrl,
        memberCount: countMap[g._id.toString()] || 0,
        channelCount: chanMap[g._id.toString()] || 0,
      })),
    )
  })

  // GET /api/users — list all users (for Friends view)
  r.get('/users', async (_req, res) => {
    const users = await User.find({}).select('username avatarColor avatarUrl status lastSeenAt').lean()
    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        avatarColor: u.avatarColor,
        avatarUrl: u.avatarUrl || '',
        status: u.status,
        lastSeenAt: u.lastSeenAt,
      })),
    )
  })

  return r
}
