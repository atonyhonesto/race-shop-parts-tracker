import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, Pagination } from '../src';

interface Row {
  id: string;
  partNumber: string;
  stock: number;
}

const columns = [
  { key: 'part', header: 'Part number', render: (row: Row) => row.partNumber },
  { key: 'stock', header: 'In stock', render: (row: Row) => row.stock, align: 'end' as const },
];

describe('DataTable', () => {
  it('renders a captioned table whose cells are announced with their column header', () => {
    render(
      <DataTable
        caption="Parts"
        columns={columns}
        rows={[{ id: '1', partNumber: 'BR-380-F', stock: 3 }]}
        getRowKey={(row) => row.id}
      />,
    );

    const table = screen.getByRole('table', { name: 'Parts' });
    expect(within(table).getByRole('columnheader', { name: 'Part number' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'BR-380-F' })).toBeInTheDocument();
  });

  it('puts the table in a named, focusable scroll region for keyboard users', () => {
    render(<DataTable caption="Parts" columns={columns} rows={[]} getRowKey={(row) => row.id} />);

    expect(screen.getByRole('region', { name: 'Parts' })).toHaveAttribute('tabindex', '0');
  });

  it('shows the empty message when there are no rows', () => {
    render(
      <DataTable
        caption="Parts"
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        emptyMessage="No parts match."
      />,
    );

    expect(screen.getByRole('cell', { name: 'No parts match.' })).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('summarises the position and disables Previous on the first page', () => {
    render(
      <Pagination
        page={1}
        pageSize={25}
        totalCount={1234}
        onPageChange={vi.fn()}
        itemLabel="parts"
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent(
      'Page 1 of 50 (1,234 parts)',
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('asks for the next page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={25} totalCount={100} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables Next on the last page', () => {
    render(<Pagination page={4} pageSize={25} totalCount={100} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
