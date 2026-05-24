import { Router } from 'express'
import mongoose from 'mongoose'
import { Guild } from '../models/Guild.js'
import { Membership } from '../models/Membership.js'

export function invitesRouter() {
  const r = Router()

  // GET /api/invites/:code — preview
  r.get('/invites/:code', async (req, res) => {
    const guild = await Guild.findOne({ inviteCode: req.params.code }).lean()
    if (!guild) return res.status(404).json({ error: 'Invalid invite' })
    const memberCount = await Membership.countDocuments({ guildId: guild._id })
    res.json({
      id: guild._id.toString(),
      name: guild.name,
      iconUrl: guild.iconUrl,
      bannerUrl: guild.bannerUrl,
      memberCount,
    })
  })

  // POST /api/invites/:code/join
  r.post('/invites/:code/join', async (req, res) => {
    const guild = await Guild.findOne({ inviteCode: req.params.code })
    if (!guild) return res.status(404).json({ error: 'Invalid invite' })
    const userId = new mongoose.Types.ObjectId(req.user.id)
    await Membership.updateOne(
      { guildId: guild._id, userId },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true },
    )
    res.json({ id: guild._id.toString(), name: guild.name, inviteCode: guild.inviteCode })
  })

  return r
}
