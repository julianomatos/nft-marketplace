import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  label?: string
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  label = 'Resultados',
}: PaginationProps) {
  if (
    !Number.isInteger(page) ||
    !Number.isInteger(totalPages) ||
    totalPages < 1 ||
    page < 1 ||
    page > totalPages
  ) {
    throw new RangeError('Pagination page must be an integer within totalPages.')
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <nav aria-label={`Paginação: ${label}`} className="flex items-center gap-2">
      <Button
        aria-label="Página anterior"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" size={16} />
      </Button>
      <div className="flex items-center gap-1">
        {pages.map((pageNumber) => (
          <Button
            aria-current={pageNumber === page ? 'page' : undefined}
            aria-label={`Página ${pageNumber}`}
            className="min-h-9 min-w-9"
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            size="icon-sm"
            type="button"
            variant={pageNumber === page ? 'default' : 'outline'}
          >
            {pageNumber}
          </Button>
        ))}
      </div>
      <span aria-live="polite" className="min-w-24 text-center text-xs">
        Página {page} de {totalPages}
      </span>
      <Button
        aria-label="Próxima página"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronRight aria-hidden="true" size={16} />
      </Button>
    </nav>
  )
}

export { Pagination, type PaginationProps }
