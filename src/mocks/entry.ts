import { mockBootstrapWindow } from './globals'

const testWindow = mockBootstrapWindow()

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const restReady = import('./browser').then(({ startMocking }) => startMocking())
  testWindow.__KURIO_MOCKS_REST_READY__ = restReady

  restReady.catch((error: unknown) => {
    testWindow.__KURIO_MOCKS_FAILED__ = error
    testWindow.__KURIO_MOCKS_ERROR__ =
      error instanceof Error ? error.message : String(error)
    console.error('Failed to initialize the demo mocks.', error)
  })
} else {
  testWindow.__KURIO_MOCKS_REST_READY__ = Promise.resolve()
}

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  window.addEventListener(
    'kurio:initialize-mock-controls',
    () => {
      testWindow.__KURIO_MOCKS_READY__ = Promise.resolve().then(async () => {
        const { initializeMockControls } = await import('./control')
        await initializeMockControls()
      })
      testWindow.__KURIO_MOCKS_READY__.catch((error: unknown) => {
        testWindow.__KURIO_MOCKS_FAILED__ = error
        testWindow.__KURIO_MOCKS_ERROR__ =
          error instanceof Error ? error.message : String(error)
        console.error('Failed to initialize the demo mock controls.', error)
      })
    },
    { once: true },
  )
}
