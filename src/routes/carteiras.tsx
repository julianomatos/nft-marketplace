import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/components/profile/profile-layout'

export const Route = createFileRoute('/carteiras')({
  component: WalletsPage,
})
