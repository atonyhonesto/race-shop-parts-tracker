import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { PartSummary } from '@raceshop/api-client';
import { Button, DataTable, Pagination, Spinner, TextField } from '@raceshop/ui';
import type { Column } from '@raceshop/ui';

import { PAGE_SIZE, usePartsSearch } from '../api/inventory';
import styles from '../app.module.css';
import { formatCost, formatNumber, formatUsage } from '../format';
import { usePageTitle } from '../usePageTitle';
import { QueryError } from './StatusPages';

const columns: readonly Column<PartSummary>[] = [
  {
    key: 'partNumber',
    header: 'Part number',
    render: (part) => <Link to={`/parts/${part.id}`}>{part.partNumber}</Link>,
  },
  { key: 'description', header: 'Description', render: (part) => part.description },
  { key: 'category', header: 'Category', render: (part) => part.category },
  { key: 'manufacturer', header: 'Manufacturer', render: (part) => part.manufacturer },
  {
    key: 'lifeLimit',
    header: 'Life limit',
    render: (part) => formatUsage(part.lifeLimit, part.lifeUnit),
    align: 'end',
  },
  { key: 'cost', header: 'Cost', render: (part) => formatCost(part.cost), align: 'end' },
  {
    key: 'inStock',
    header: 'In stock',
    render: (part) => formatNumber(part.inStockCount),
    align: 'end',
  },
  {
    key: 'installed',
    header: 'Installed',
    render: (part) => formatNumber(part.installedCount),
    align: 'end',
  },
];

/** Search lives in the URL (?search=&page=), so results can be bookmarked and shared, and Back works. */
export function PartsPage() {
  usePageTitle('Parts');
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [draft, setDraft] = useState(search);
  const parts = usePartsSearch(search, page);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams(draft.trim() ? { search: draft.trim() } : {});
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Parts</h1>
      </div>

      <search>
        <form className={styles.search} onSubmit={submit}>
          <TextField
            label="Search parts"
            hint="Part number, description or manufacturer"
            type="search"
            value={draft}
            maxLength={100}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>
      </search>

      {parts.isPending && <Spinner label="Loading parts" />}
      {parts.isError && <QueryError error={parts.error} what="parts" />}
      {parts.data && (
        <>
          <DataTable
            caption={search ? `Parts matching "${search}"` : 'All parts'}
            columns={columns}
            rows={parts.data.items}
            getRowKey={(part) => part.id}
            emptyMessage="No parts match this search."
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={parts.data.totalCount}
            itemLabel="parts"
            onPageChange={(next) => {
              setParams({ ...(search ? { search } : {}), page: String(next) });
            }}
          />
        </>
      )}
    </div>
  );
}
