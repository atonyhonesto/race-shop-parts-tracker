import { Link, useParams } from 'react-router';

import type { LifeUnit, SerializedPartSummary } from '@raceshop/api-client';
import { DataTable, LifeGauge, StatusBadge } from '@raceshop/ui';
import type { Column } from '@raceshop/ui';

import { usePart } from '../api/inventory';
import styles from '../app.module.css';
import { formatCost, formatUsage, partStatus, unitName } from '../format';
import { usePageTitle } from '../usePageTitle';
import { PendingState } from '../offline/offline';
import { QueryError } from './StatusPages';

function serialColumns(limit: number, unit: LifeUnit): readonly Column<SerializedPartSummary>[] {
  return [
    {
      key: 'serial',
      header: 'Serial number',
      render: (serial) => <Link to={`/serialized-parts/${serial.id}`}>{serial.serialNumber}</Link>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (serial) => (
        <StatusBadge tone={partStatus[serial.status].tone}>
          {partStatus[serial.status].label}
        </StatusBadge>
      ),
    },
    {
      key: 'life',
      header: 'Life used',
      render: (serial) => (
        <LifeGauge
          percent={serial.lifeUsedPercent}
          status={serial.lifeStatus}
          label={`Life used, ${serial.serialNumber}`}
        />
      ),
    },
    {
      key: 'usage',
      header: `Usage (${unitName(unit)})`,
      render: (serial) =>
        `${formatUsage(serial.accumulatedUsage, unit)} of ${formatUsage(limit, unit)}`,
      align: 'end',
    },
    { key: 'car', header: 'On car', render: (serial) => serial.installedOnCarNumber ?? '—' },
  ];
}

export function PartDetailPage() {
  const { partId = '' } = useParams();
  const part = usePart(partId);
  usePageTitle(part.data ? part.data.partNumber : 'Part');

  if (part.isPending) return <PendingState query={part} label="part" />;
  if (part.isError) return <QueryError error={part.error} what="this part" />;

  const { data } = part;
  return (
    <div className={styles.page}>
      <div>
        <h1>{data.partNumber}</h1>
        <p className={styles.subtitle}>{data.description}</p>
      </div>

      <dl className={styles.details}>
        <div>
          <dt>Category</dt>
          <dd>{data.category}</dd>
        </div>
        <div>
          <dt>Manufacturer</dt>
          <dd>{data.manufacturer}</dd>
        </div>
        <div>
          <dt>Life limit</dt>
          <dd>{formatUsage(data.lifeLimit, data.lifeUnit)}</dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>{formatCost(data.cost)}</dd>
        </div>
      </dl>

      <DataTable
        caption={`Serialized parts (${String(data.serializedParts.length)})`}
        columns={serialColumns(data.lifeLimit, data.lifeUnit)}
        rows={data.serializedParts}
        getRowKey={(serial) => serial.id}
        emptyMessage="No serialized parts for this part number yet."
      />
    </div>
  );
}
