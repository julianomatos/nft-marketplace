import { expect, test } from '@playwright/test'
import { users } from '../../src/mocks/fixtures'
import {
  MOCK_STATE_STORAGE_KEY,
  hashPassword,
  readMockState,
  resetMockState,
  validatePassword,
} from '../../src/mocks/store'

const storage = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    },
  },
})

const knownPasswords = {
  'ana@kurio.example.test': 'KurioDemo!A2026',
  'caio@kurio.example.test': 'KurioDemo!B2026',
} as const

for (const user of users) {
  test(`mock state reset and credential hashing stay consistent for ${user.email}`, async () => {
    const password = knownPasswords[user.email as keyof typeof knownPasswords]
    const nextState = resetMockState('design-cart')

    expect(nextState.scenario).toBe('design-cart')
    expect(nextState.carts.some(({ userId }) => userId === 'collector-ana')).toBe(true)
    expect(globalThis.localStorage.getItem(MOCK_STATE_STORAGE_KEY)).not.toBeNull()

    const saved = readMockState()
    expect(saved.scenario).toBe('design-cart')
    expect(saved.carts.some(({ userId }) => userId === 'collector-ana')).toBe(true)

    const hash = await hashPassword(password, user.passwordSalt)
    expect(hash).toBe(user.passwordHash)

    expect(await validatePassword(user, password)).toBe(true)
    expect(await validatePassword(user, `${password}!wrong`)).toBe(false)
  })
}
