import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { signToken } from '../middleware/auth.js'

export function authRouter({ jwtSecret }) {
  const r = Router()

  r.post('/register', async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password || username.length < 3 || password.length < 6)
      return res.status(400).json({ error: 'Username (3+) and password (6+) required' })
    const exists = await User.findOne({ username })
    if (exists) return res.status(409).json({ error: 'Username taken' })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ username, passwordHash, status: 'online' })
    res.json({ token: signToken(user, jwtSecret), user: user.toPublic() })
  })

  r.post('/login', async (req, res) => {
    const { username, password } = req.body || {}
    const user = await User.findOne({ username })
    if (!user) return res.status(401).json({ error: 'Bad credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Bad credentials' })
    user.status = 'online'
    user.lastSeenAt = new Date()
    await user.save()
    res.json({ token: signToken(user, jwtSecret), user: user.toPublic() })
  })

  return r
}
