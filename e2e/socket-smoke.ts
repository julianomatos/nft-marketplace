import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { setupWorker } from 'msw/browser'

const result = document.querySelector<HTMLParagraphElement>('#result')

if (!result) {
  throw new Error('Socket.IO smoke test status element is missing')
}

const socketUrl = new URL('/socket.io/', window.location.href)
socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
const escapedSocketOrigin = socketUrl.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const socketHandler = ws
  .link(new RegExp(`^${escapedSocketOrigin}/$`))
  .addEventListener('connection', (connection) => {
    const { client } = toSocketIo(connection)

    client.on('smoke:ready', () => {
      client.emit('smoke:event', {
        message: 'Socket.IO event received from MSW',
      })
    })
  })

const worker = setupWorker(socketHandler)
let disconnectSocket: (() => void) | undefined

window.addEventListener('beforeunload', () => {
  disconnectSocket?.()
  void worker.stop()
})

void worker
  .start({ onUnhandledRequest: 'error' })
  .then(async () => {
    result.textContent = 'MSW started; connecting Socket.IO'

    const { io } = await import('socket.io-client')
    const socket = io(window.location.origin, {
      autoConnect: false,
      path: '/socket.io/',
      transports: ['websocket'],
    })

    disconnectSocket = () => socket.disconnect()

    socket.on('connect', () => {
      socket.emit('smoke:ready')
    })

    socket.on('smoke:event', ({ message }: { message: string }) => {
      result.textContent = message
    })

    socket.on('connect_error', (error: Error) => {
      result.textContent = `Socket.IO connection failed: ${error.message}`
    })

    socket.connect()
  })
  .catch((error: unknown) => {
    result.textContent =
      error instanceof Error
        ? `MSW startup failed: ${error.message}`
        : 'MSW startup failed'
  })
