import type { NftReview } from '../../types/contracts'
import type { ReviewRecord } from '../types'

const emeraldReviewerNames = [
  'Lia Costa', 'Ravi Almeida', 'Noah Martins', 'Bia Santos', 'Theo Lima',
  'Nina Rocha', 'Caio Nunes', 'Maya Ribeiro', 'Luca Ferreira', 'Iris Melo',
  'Enzo Barros', 'Luna Freitas', 'Davi Azevedo', 'Cora Dias', 'Yuri Campos',
  'Eva Moura', 'Ian Cardoso', 'Zoe Pinto', 'Leo Carvalho',
] as const

const emeraldRatings = [
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4,
] as const

const emeraldComments = [
  'Uma peça marcante da coleção.',
  'A paleta e os detalhes são incríveis.',
  'Ficou ainda melhor na minha coleção.',
  'Arte muito bem resolvida.',
  'Uma das minhas favoritas.',
] as const

const emeraldReviews: readonly NftReview[] = emeraldReviewerNames.map(
  (displayName, index) => ({
    id: `review-emerald-ape-042-${String(index + 1).padStart(2, '0')}`,
    displayName,
    rating: emeraldRatings[index],
    comment: emeraldComments[index % emeraldComments.length],
    createdAt: `2026-07-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
  }),
)

export const reviews: readonly ReviewRecord[] = [
  ...emeraldReviews.map((review) => ({
    ...review,
    nftId: 'emerald-ape-042',
  })),
  {
    id: 'review-sage-nomad-009-01',
    nftId: 'sage-nomad-009',
    displayName: 'Mila Duarte',
    rating: 5,
    comment: 'Uma composição muito elegante.',
    createdAt: '2026-07-20T10:00:00.000Z',
  },
  {
    id: 'review-sage-nomad-009-02',
    nftId: 'sage-nomad-009',
    displayName: 'Otto Reis',
    rating: 4,
    comment: 'Ótima peça para a coleção.',
    createdAt: '2026-07-21T10:00:00.000Z',
  },
  {
    id: 'review-golden-beat-207-01',
    nftId: 'golden-beat-207',
    displayName: 'Sol Pires',
    rating: 5,
    comment: 'Energia e cor na medida.',
    createdAt: '2026-07-22T10:00:00.000Z',
  },
  {
    id: 'review-golden-beat-207-02',
    nftId: 'golden-beat-207',
    displayName: 'Léo Farias',
    rating: 4,
    comment: 'Uma arte muito divertida.',
    createdAt: '2026-07-23T10:00:00.000Z',
  },
]
