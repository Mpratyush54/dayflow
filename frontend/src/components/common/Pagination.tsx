import './Pagination.css';

interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pages, total, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  const pageNumbers: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== '…') {
      pageNumbers.push('…');
    }
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="btn btn--outline pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </button>
      {pageNumbers.map((p, idx) =>
        p === '…' ? (
          <span key={`ellipsis-${idx}`} className="pagination__ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`pagination__page ${p === page ? 'is-active' : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p as number)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="btn btn--outline pagination__btn"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
      {typeof total === 'number' && (
        <span className="pagination__total">{total} total</span>
      )}
    </nav>
  );
}
