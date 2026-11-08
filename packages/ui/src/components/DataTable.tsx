import type { ReactNode } from 'react';

import { cx } from '../cx';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Right-align numbers so digits line up. */
  align?: 'start' | 'end';
}

export interface DataTableProps<T> {
  /** Names the table for screen readers and labels the scroll region. */
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
}

/**
 * A semantic <table> with a caption and column headers, so screen readers can announce each
 * cell with its header. The scroll region is focusable, so keyboard users can scroll it (WCAG 2.1.1).
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyMessage = 'Nothing to show.',
}: DataTableProps<T>) {
  return (
    // A scrollable region must be focusable and named so keyboard users can reach and scroll it.
    <div className={styles.region} role="region" aria-label={caption} tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cx(column.align === 'end' && styles.end)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cx(column.align === 'end' && styles.end)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
