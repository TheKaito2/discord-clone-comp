import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { Server as IOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import { connectDB } from './db.js'
import { authRouter } from './routes/auth.js'
import { guildsRouter } from './routes/guilds.js'
import { messagesRouter } from './routes/messages.js'
import { searchRouter } from './routes/search.js'
import { invitesRouter } from './routes/invites.js'
import { discoverRouter } from './routes/discover.js'
import { requireJwt } from './middleware/auth.js'
import { wireChat } from './sockets/chat.js'
import { wireVoice } from './sockets/voice.js'
import { wirePresence } from './sockets/presence.js'

const PORT = Number(process.env.PORT || 4000)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/discord_comp'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

await connectDB(MONGO_URI)

const app = express()
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))
app.use('/api/auth', authRouter({ jwtSecret: JWT_SECRET }))

const protect = requireJwt(JWT_SECRET)
app.use('/api', protect, guildsRouter())
app.use('/api', protect, messagesRouter())
app.use('/api', protect, searchRouter())
app.use('/api', protect, invitesRouter())
app.use('/api', protect, discoverRouter())

const server = http.createServer(app)
const io = new IOServer(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
})
app.set('io', io)

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('no token'))
  try {
    socket.data.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    next(new Error('bad token'))
  }
})

wirePresence(io)
wireChat(io)
wireVoice(io)

io.on('connection', (s) => {
  console.log(`[ws] ${s.data.user.username} connected (${s.id})`)
  s.on('disconnect', () => console.log(`[ws] ${s.data.user.username} disconnected`))
})

server.listen(PORT, () => console.log(`[http] listening :${PORT}`))
