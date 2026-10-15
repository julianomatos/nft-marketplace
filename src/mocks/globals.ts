export type MockBootstrapWindow = Window & {
  __KURIO_MOCKS_READY__?: Promise<void>
  __KURIO_MOCKS_REST_READY__?: Promise<void>
  __KURIO_SOCKET_MOCK_READY__?: Promise<void>
  __KURIO_MOCKS_FAILED__?: unknown
  __KURIO_MOCKS_ERROR__?: string
}

export function mockBootstrapWindow(): MockBootstrapWindow {
  return window as MockBootstrapWindow
}
