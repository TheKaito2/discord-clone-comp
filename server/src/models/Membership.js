import mongoose from 'mongoose'

const MembershipSchema = new mongoose.Schema(
  {
    guildId:  { type: mongoose.Types.ObjectId, ref: 'Guild', required: true, index: true },
    userId:   { type: mongoose.Types.ObjectId, ref: 'User',  required: true, index: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

MembershipSchema.index({ guildId: 1, userId: 1 }, { unique: true })

export const Membership = mongoose.model('Membership', MembershipSchema)
