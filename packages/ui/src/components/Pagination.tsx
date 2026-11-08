import styles from './Layout.module.css';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the summary, e.g. "parts". */
  itemLabel?: string;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <Button
        onClick={() => {
          onPageChange(page - 1);
        }}
        disabled={page <= 1}
      >
        Previous
      </Button>
      {/* Polite live region: the new position is announced after Previous/Next, without moving focus. */}
      <span aria-live="polite" className={styles.pageSummary}>
        Page {page} of {pageCount} ({totalCount.toLocaleString('en-US')} {itemLabel})
      </span>
      <Button
        onClick={() => {
          onPageChange(page + 1);
        }}
        disabled={page >= pageCount}
      >
        Next
      </Button>
    </nav>
  );
}
