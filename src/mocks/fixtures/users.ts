import type { FixtureUser } from '../types'

export const users = [
  {
    id: 'collector-ana',
    displayName: 'Ana Oliveira',
    username: 'ana-oliveira',
    email: 'ana@kurio.example.test',
    ensName: 'ana.kurio.eth',
    referralCode: 'KURIO-ANA-042',
    avatar: '/assets/nfts/emerald-ape-480.webp',
    passwordSalt: 'kurio-fixture-salt-a-2026',
    passwordHash:
      '7c41d0e44b6b93ff1638acc0f4c4f6abe7917736ff157e02ea50c422486101ee',
    walletIds: ['wallet-ana-primary', 'wallet-ana-reserve'],
  },
  {
    id: 'collector-caio',
    displayName: 'Caio Martins',
    username: 'caio-martins',
    email: 'caio@kurio.example.test',
    ensName: 'caio.kurio.eth',
    referralCode: 'KURIO-CAIO-009',
    avatar: '/assets/nfts/black-gorilla-480.webp',
    passwordSalt: 'kurio-fixture-salt-b-2026',
    passwordHash:
      '746e6ba84804f5cd4713757df5bcb8c4c867b43a2150cc67af4bea9b1400c03e',
    walletIds: ['wallet-caio-primary'],
  },
] as const satisfies readonly FixtureUser[]
