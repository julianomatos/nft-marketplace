import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/components/home/home-page'
import {
  catalogSearchSchema,
  validateSearchWithZod,
} from '@/utils/search-params'

export const Route = createFileRoute('/')({
  validateSearch: validateSearchWithZod(catalogSearchSchema),
  component: HomePage,
})
