import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/components/profile/profile-layout'

export const Route = createFileRoute('/favoritos')({
  component: FavoritesPage,
})
