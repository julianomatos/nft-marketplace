import { createFileRoute } from '@tanstack/react-router'
import { ProfileOverviewPage } from '@/components/profile/profile-layout'

export const Route = createFileRoute('/perfil')({
  component: ProfileOverviewPage,
})
