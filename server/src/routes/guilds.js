import { Router } from 'express'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { Guild } from '../models/Guild.js'
import { Channel } from '../models/Channel.js'
import { Membership } from '../models/Membership.js'
import { User } from '../models/User.js'

// Default channel sets per template — matches Discord's "Create Server" wizard
const TEMPLATES = {
  custom:  { Text: [{ name: 'general' }], Voice: [{ name: 'General', type: 'voice' }] },
  gaming:  { Text: [{ name: 'general' }, { name: 'events' }, { name: 'looking-for-group' }], Voice: [{ name: 'Lobby', type: 'voice' }, { name: 'Game Talk', type: 'voice' }] },
  friends: { Text: [{ name: 'general' }, { name: 'memes' }], Voice: [{ name: 'Hang Out', type: 'voice' }] },
  study:   { Text: [{ name: 'general' }, { name: 'homework-help' }, { name: 'study-resources' }], Voice: [{ name: 'Study Room', type: 'voice' }] },
  school:  { Text: [{ name: 'general' }, { name: 'announcements' }, { name: 'events' }], Voice: [{ name: 'Club Meeting', type: 'voice' }] },
}

export function guildsRouter() {
  const r = Router()

  // POST /api/guilds — create new server (with optional template)
  r.post('/guilds', async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const name = (req.body?.name || '').toString().trim()
    const template = req.body?.template || 'custom'
    if (name.length < 2 || name.length > 50) return res.status(400).json({ error: 'Name must be 2-50 chars' })
    const spec = TEMPLATES[template] || TEMPLATES.custom

    const guild = await Guild.create({
      name,
      ownerId: userId,
      iconUrl: '',
      inviteCode: nanoid(8),
    })
    await Membership.create({ guildId: guild._id, userId })

    let pos = 0
    for (const [category, list] of Object.entries(spec)) {
      for (const c of list) {
        await Channel.create({
          guildId: guild._id,
          name: c.name,
          type: c.type || 'text',
          category,
          topic: '',
          position: pos++,
        })
      }
    }

    const channels = await Channel.find({ guildId: guild._id }).sort({ position: 1 }).lean()
    res.json({
      id: guild._id.toString(),
      name: guild.name,
      iconUrl: '',
      bannerUrl: '',
      inviteCode: guild.inviteCode,
      ownerId: userId.toString(),
      channels: channels.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        type: c.type,
        category: c.category,
        topic: c.topic,
        position: c.position,
      })),
    })
  })

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

  // PATCH /api/me — update own profile (displayName, username, email, phone, avatarColor)
  r.patch('/me', async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const { displayName, username, email, phone, avatarColor } = req.body || {}
    const update = {}
    if (typeof displayName === 'string') update.displayName = displayName.trim().slice(0, 32)
    if (typeof username === 'string') {
      const u = username.trim()
      if (u.length < 3 || u.length > 32) return res.status(400).json({ error: 'Username must be 3–32 chars' })
      update.username = u
    }
    if (typeof email === 'string') update.email = email.trim().slice(0, 120)
    if (typeof phone === 'string') update.phone = phone.trim().slice(0, 30)
    if (typeof avatarColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(avatarColor)) update.avatarColor = avatarColor
    try {
      const user = await User.findByIdAndUpdate(userId, update, { new: true })
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json(user.toPublic())
    } catch (e) {
      if (e?.code === 11000) return res.status(409).json({ error: 'Username already taken' })
      console.error('[PATCH /me]', e)
      res.status(500).json({ error: 'Update failed' })
    }
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
        avatarUrl: u.avatarUrl || '',
        status: u.status,
      })),
    )
  })

  return r
}
