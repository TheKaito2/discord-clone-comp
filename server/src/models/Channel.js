import mongoose from 'mongoose'

const ChannelSchema = new mongoose.Schema(
  {
    guildId:        { type: mongoose.Types.ObjectId, ref: 'Guild', default: null, index: true },
    name:           { type: String, default: '' },
    type:           { type: String, enum: ['text', 'voice', 'dm'], default: 'text' },
    category:       { type: String, default: 'General' },
    position:       { type: Number, default: 0 },
    topic:          { type: String, default: '' },
    participantIds: { type: [mongoose.Types.ObjectId], default: [], index: true },
    pairKey:        { type: String, default: null, index: true, unique: false, sparse: true },
  },
  { timestamps: true },
)

export const Channel = mongoose.model('Channel', ChannelSchema)
