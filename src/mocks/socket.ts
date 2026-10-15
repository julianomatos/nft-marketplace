import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { getMockNow, readMockState } from './store'
import {
  addSocketPeer,
  removeSocketPeer,
  type SocketPeer,
} from './socket-events'

export function createMockSocketHandler(origin: string) {
  const socketUrl = new URL('/socket.io/', origin)
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const escapedSocketOrigin = socketUrl.origin.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )

  return ws
    .link(new RegExp(`^${escapedSocketOrigin}/$`))
    .addEventListener('connection', (connection) => {
      const { client } = toSocketIo(connection)
      const peer: SocketPeer = {
        userId: null,
        token: null,
        subscribed: false,
        emit: (event, payload) => client.emit(event, payload),
      }
      addSocketPeer(peer)

      client.on('mock:subscribe', (_message, token: unknown) => {
        if (token !== undefined && token !== null && typeof token !== 'string') {
          client.emit('mock:subscription-error', {
            code: 'UNAUTHENTICATED',
          })
          return
        }

        const state = readMockState()
        const session = state.session
        const sessionIsValid =
          typeof token === 'string' &&
          token === session.token &&
          session.userId !== null &&
          session.expiresAt !== null &&
          new Date(session.expiresAt).getTime() > new Date(getMockNow()).getTime()

        if (token && !sessionIsValid) {
          peer.subscribed = false
          peer.userId = null
          peer.token = null
          client.emit('mock:subscription-error', {
            code: session.expiresAt &&
              new Date(session.expiresAt).getTime() <= new Date(getMockNow()).getTime()
              ? 'SESSION_EXPIRED'
              : 'UNAUTHENTICATED',
          })
          return
        }

        peer.userId = sessionIsValid ? session.userId : null
        peer.token = sessionIsValid ? token : null
        peer.subscribed = true
        client.emit('mock:subscribed', { userId: peer.userId })
      })

      connection.client.addEventListener('close', () => {
        removeSocketPeer(peer)
      })
    })
}
