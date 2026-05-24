import mongoose from 'mongoose'

const GuildSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true },
    iconUrl:    { type: String, default: '' },
    bannerUrl:  { type: String, default: '' },
    ownerId:    { type: mongoose.Types.ObjectId, ref: 'User' },
    inviteCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
)

export const Guild = mongoose.model('Guild', GuildSchema)
