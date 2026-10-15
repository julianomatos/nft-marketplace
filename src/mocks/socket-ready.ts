import { mockBootstrapWindow } from './globals'

export function whenSocketMockReady(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return Promise.resolve()
  }

  return mockBootstrapWindow().__KURIO_SOCKET_MOCK_READY__ ?? Promise.resolve()
}
