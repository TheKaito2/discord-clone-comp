import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { connectDB } from './db.js'
import { User } from './models/User.js'
import { Guild } from './models/Guild.js'
import { Channel } from './models/Channel.js'
import { Membership } from './models/Membership.js'
import { Message } from './models/Message.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/discord_comp'

await connectDB(MONGO_URI)

console.log('[seed] wiping…')
await Promise.all([
  User.deleteMany({}),
  Guild.deleteMany({}),
  Channel.deleteMany({}),
  Membership.deleteMany({}),
  Message.deleteMany({}),
])

const userNames = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank']
const pwHash = await bcrypt.hash('password', 10)
const users = await User.insertMany(
  userNames.map((u) => ({
    username: u,
    passwordHash: pwHash,
    status: 'online',
    avatarUrl: `/avatars/${u}.jpg`,
  })),
)
const userByName = Object.fromEntries(users.map((u) => [u.username, u]))

const guildsSpec = [
  {
    name: 'Friends of Figma',
    iconText: 'F',
    bannerUrl: '',
    channels: {
      Welcome: [
        { name: 'rules', type: 'text', topic: 'Read before chatting' },
        { name: 'general-roles', type: 'text', topic: 'Pick your role!' },
        { name: 'announcements', type: 'text', topic: 'Server-wide news' },
      ],
      Chat: [
        { name: 'general', type: 'text' },
        { name: 'random', type: 'text' },
        { name: 'deploy-talk', type: 'text', topic: 'CI/CD ramblings' },
      ],
      Voice: [
        { name: 'Lounge', type: 'voice' },
        { name: 'Focus Room', type: 'voice' },
      ],
    },
  },
  {
    name: 'Gamers United',
    iconText: 'G',
    channels: {
      Welcome: [{ name: 'welcome', type: 'text' }],
      Games: [
        { name: 'valorant', type: 'text' },
        { name: 'minecraft', type: 'text' },
        { name: 'league', type: 'text' },
      ],
      Voice: [
        { name: 'Squad', type: 'voice' },
        { name: 'AFK', type: 'voice' },
      ],
    },
  },
  {
    name: 'Indie Devs',
    iconText: 'I',
    channels: {
      Hub: [
        { name: 'introductions', type: 'text' },
        { name: 'showcase', type: 'text' },
        { name: 'feedback', type: 'text' },
      ],
      Voice: [{ name: 'Pair Programming', type: 'voice' }],
    },
  },
]

const sampleMessages = [
  'gm chat ☕',
  "i'm thinking we should deploy on friday — too risky?",
  'lol no — wait until monday',
  'has anyone tried the new vite 8 release? it broke my polyfills',
  'figma kit looks SO clean tho',
  'pushing the auth fix in 5',
  'who wants to pair on the channel refactor',
  'we need more emoji 🙏',
  'shipping > perfect',
  '+1, smoke test passes locally',
  'reminder: stand-up in 10',
  'docs updated, please review when you have a sec',
  'wifi is being weird today',
  'someone help me debug this socket reconnect loop pls',
  'the new infinite scroll feels great',
  'TIL mongoose lets you do text indexes for free',
  'omg the discord rebrand colors are still confusing',
  '#5865F2 is burned into my retinas',
  'morning crew ☕',
  'gn folks',
]

for (const gs of guildsSpec) {
  const owner = users[0]
  const guild = await Guild.create({
    name: gs.name,
    ownerId: owner._id,
    iconUrl: '',
    inviteCode: nanoid(8),
  })
  // every seed user joins every guild for demo
  await Membership.insertMany(users.map((u) => ({ guildId: guild._id, userId: u._id })))

  let pos = 0
  const txtChannels = []
  for (const [category, list] of Object.entries(gs.channels)) {
    for (const c of list) {
      const ch = await Channel.create({
        guildId: guild._id,
        name: c.name,
        type: c.type,
        category,
        topic: c.topic || '',
        position: pos++,
      })
      if (c.type === 'text') txtChannels.push(ch)
    }
  }

  // 30+ messages per text channel
  for (const ch of txtChannels) {
    const msgs = []
    const base = Date.now() - 1000 * 60 * 60 * 24 // 24h ago
    for (let i = 0; i < 32; i++) {
      msgs.push({
        channelId: ch._id,
        authorId: users[i % users.length]._id,
        content: sampleMessages[i % sampleMessages.length],
        createdAt: new Date(base + i * 1000 * 60 * Math.random() * 30),
      })
    }
    await Message.insertMany(msgs)
  }

  console.log(`[seed] guild "${gs.name}"  invite=${guild.inviteCode}  channels=${txtChannels.length}+`)
}

console.log('[seed] done')
console.log('[seed] users (pw=password):', userNames.join(', '))
process.exit(0)
