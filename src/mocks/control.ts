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
import { API_ENDPOINTS } from '../types/endpoints'
import { apiClient } from '../services/api-client'
import { registerSessionSocket } from '../services/socket-registry'
import type { Profile } from '../types/contracts'

async function requestProfile() {
  return apiClient.get<Profile>(API_ENDPOINTS.profile.current)
}

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
  const userId = readMockState().session.userId
  if (token && userId) {
    const unregister = registerSessionSocket(socket, userId)
    socket.once('disconnect', unregister)
  }
  socket.connect()
  return socket
}

export const kurioMocks = {
  reset: resetMockState,
  setLatency: setMockLatency,
  setTimeoutResponseDelay: setMockTimeoutResponseDelay,
  settleOrder: settleMockOrder,
  connectSocketClient,
  requestProfile,
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
