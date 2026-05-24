import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/auth'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (socket) return socket
  const token = useAuthStore.getState().token
  socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
    path: '/socket.io',
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  })
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
