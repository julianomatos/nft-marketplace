import {
  advanceMockNow,
  getMockNow,
  persistMockState,
  readMockState,
  resetMockNow,
  resetMockState,
  setMockNow,
  settleOrder,
} from './store'

export const kurioMocks = {
  reset: resetMockState,
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
