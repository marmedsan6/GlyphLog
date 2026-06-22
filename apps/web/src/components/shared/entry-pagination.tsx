import { Button } from '@/components/ui/button'

interface EntryPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const MAX_VISIBLE_PAGES = 5

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const half = Math.floor(MAX_VISIBLE_PAGES / 2)
  let start = Math.max(1, currentPage - half)
  const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1)

  if (end - start + 1 < MAX_VISIBLE_PAGES) {
    start = Math.max(1, end - MAX_VISIBLE_PAGES + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function EntryPagination({ page, totalPages, onPageChange }: EntryPaginationProps) {
  if (totalPages <= 1) return null

  const visiblePages = getVisiblePages(page, totalPages)

  return (
    <nav aria-label="Paginación de colección" className="flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Anterior
      </Button>

      {visiblePages.map((pageNumber) => (
        <Button
          key={pageNumber}
          type="button"
          variant={pageNumber === page ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(pageNumber)}
          aria-current={pageNumber === page ? 'page' : undefined}
        >
          {pageNumber}
        </Button>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente
      </Button>
    </nav>
  )
}
