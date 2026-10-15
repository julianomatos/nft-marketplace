import { mockBootstrapWindow } from './globals'

const testWindow = mockBootstrapWindow()

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const restReady = import('./browser').then(({ startMocking }) => startMocking())
  const socketReady = restReady.then(() =>
    import('./browser').then(({ attachSocketMock }) => attachSocketMock()),
  )
  const ready = socketReady.then(() => import('./control')).then(() => undefined)

  testWindow.__KURIO_MOCKS_REST_READY__ = restReady
  testWindow.__KURIO_SOCKET_MOCK_READY__ = socketReady
  testWindow.__KURIO_MOCKS_READY__ = ready

  ready.catch((error: unknown) => {
    testWindow.__KURIO_MOCKS_FAILED__ = error
    testWindow.__KURIO_MOCKS_ERROR__ =
      error instanceof Error ? error.message : String(error)
    console.error('Failed to initialize the demo mocks.', error)
  })
} else {
  testWindow.__KURIO_MOCKS_REST_READY__ = Promise.resolve()
  testWindow.__KURIO_SOCKET_MOCK_READY__ = Promise.resolve()
}
