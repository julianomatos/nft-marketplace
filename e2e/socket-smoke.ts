const result = document.querySelector<HTMLParagraphElement>('#result')

if (!result) {
  throw new Error('Socket.IO smoke test status element is missing')
}

let disconnectSocket: (() => void) | undefined

window.addEventListener('beforeunload', () => {
  disconnectSocket?.()
})

void (async () => {
  const { initializeMockControls } = await import('../src/mocks/control')
  await initializeMockControls()
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
})()
  .catch((error: unknown) => {
    result.textContent =
      error instanceof Error
        ? `MSW startup failed: ${error.message}`
        : 'MSW startup failed'
  })
