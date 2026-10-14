import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type SkeletonProps = ComponentProps<'div'>

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('skeleton-shimmer', className)}
    />
  )
}

export { Skeleton, type SkeletonProps }
