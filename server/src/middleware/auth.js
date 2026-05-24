import jwt from 'jsonwebtoken'

export function signToken(user, secret) {
  return jwt.sign({ id: user._id.toString(), username: user.username }, secret, {
    expiresIn: '7d',
  })
}

export function requireJwt(secret) {
  return (req, res, next) => {
    const h = req.headers.authorization || ''
    const m = h.match(/^Bearer (.+)$/)
    if (!m) return res.status(401).json({ error: 'No token' })
    try {
      req.user = jwt.verify(m[1], secret)
      next()
    } catch {
      res.status(401).json({ error: 'Invalid token' })
    }
  }
}
