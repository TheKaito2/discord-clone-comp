import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema(
  {
    channelId: { type: mongoose.Types.ObjectId, ref: 'Channel', required: true, index: true },
    authorId:  { type: mongoose.Types.ObjectId, ref: 'User',    required: true },
    content:   { type: String, required: true },
    editedAt:  { type: Date, default: null },
  },
  { timestamps: true },
)

MessageSchema.index({ channelId: 1, createdAt: -1 })
MessageSchema.index({ content: 'text' })

export const Message = mongoose.model('Message', MessageSchema)
