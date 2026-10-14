import type { Socket } from 'socket.io-client'

type SessionSocket = {
  socket: Socket
  userId: string
}

const sessionSockets = new Set<SessionSocket>()

function registerSessionSocket(socket: Socket, userId: string): () => void {
  const entry = { socket, userId }
  sessionSockets.add(entry)

  return () => {
    sessionSockets.delete(entry)
  }
}

function disconnectSessionSockets(userId?: string): void {
  for (const entry of sessionSockets) {
    if (userId && entry.userId !== userId) continue
    entry.socket.removeAllListeners()
    entry.socket.disconnect()
    sessionSockets.delete(entry)
  }
}

export { disconnectSessionSockets, registerSessionSocket }
