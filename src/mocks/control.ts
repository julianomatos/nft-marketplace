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
  settleOrder,
} from './store'

export const kurioMocks = {
  reset: resetMockState,
  setLatency: setMockLatency,
  setTimeoutResponseDelay: setMockTimeoutResponseDelay,
  settleOrder,
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
