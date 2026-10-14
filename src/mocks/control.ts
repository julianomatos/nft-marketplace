import {
  advanceMockNow,
  getMockNow,
  persistMockState,
  readMockState,
  resetMockNow,
  resetMockState,
  setMockLatency,
  setMockNow,
  setMockTimeoutResponseDelay,
} from './store'
import { settleMockOrder } from './settle-order'
import type { Socket } from 'socket.io-client'

async function connectSocketClient(tokenOverride?: string | null): Promise<Socket> {
  const { io } = await import('socket.io-client')
  const socket = io(window.location.origin, {
    autoConnect: false,
    path: '/socket.io/',
    transports: ['websocket'],
  })
  const token =
    tokenOverride === undefined
      ? window.sessionStorage.getItem('kurio.session.token')
      : tokenOverride
  socket.on('connect', () => {
    socket.emit('mock:subscribe', token)
  })
  socket.connect()
  return socket
}

export const kurioMocks = {
  reset: resetMockState,
  setLatency: setMockLatency,
  setTimeoutResponseDelay: setMockTimeoutResponseDelay,
  settleOrder: settleMockOrder,
  connectSocketClient,
  setMockTime: setMockNow,
  advanceMockTime: advanceMockNow,
  resetMockTime: resetMockNow,
  getMockTime: getMockNow,
  getState: readMockState,
  setState: persistMockState,
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { __KURIO_MOCKS__: typeof kurioMocks }).__KURIO_MOCKS__ =
    kurioMocks
}

export type KurioMocksControl = typeof kurioMocks
