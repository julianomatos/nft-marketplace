import { createFileRoute } from '@tanstack/react-router'
import { HomeIntro } from '@/components/home/home-intro'
import {
  catalogSearchSchema,
  validateSearchWithZod,
} from '@/utils/search-params'

export const Route = createFileRoute('/')({
  validateSearch: validateSearchWithZod(catalogSearchSchema),
  component: HomeIntro,
})
