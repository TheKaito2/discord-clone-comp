import mongoose from 'mongoose'

const palette = ['#5865F2', '#EB459E', '#FAA61A', '#23A559', '#F23F42', '#9139FF']

const UserSchema = new mongoose.Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true, minlength: 3 },
    passwordHash: { type: String, required: true },
    displayName:  { type: String, default: '' },
    email:        { type: String, default: '' },
    phone:        { type: String, default: '' },
    avatarColor:  { type: String, default: () => palette[Math.floor(Math.random() * palette.length)] },
    avatarUrl:    { type: String, default: '' },
    status:       { type: String, enum: ['online', 'idle', 'dnd', 'offline'], default: 'offline' },
    lastSeenAt:   { type: Date, default: Date.now },
  },
  { timestamps: true },
)

UserSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    displayName: this.displayName || '',
    email: this.email || '',
    phone: this.phone || '',
    avatarColor: this.avatarColor,
    avatarUrl: this.avatarUrl,
    status: this.status,
  }
}

export const User = mongoose.model('User', UserSchema)
