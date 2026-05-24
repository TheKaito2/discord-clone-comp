import mongoose from 'mongoose'

const ChannelSchema = new mongoose.Schema(
  {
    guildId:  { type: mongoose.Types.ObjectId, ref: 'Guild', required: true, index: true },
    name:     { type: String, required: true },
    type:     { type: String, enum: ['text', 'voice'], default: 'text' },
    category: { type: String, default: 'General' },
    position: { type: Number, default: 0 },
    topic:    { type: String, default: '' },
  },
  { timestamps: true },
)

export const Channel = mongoose.model('Channel', ChannelSchema)
