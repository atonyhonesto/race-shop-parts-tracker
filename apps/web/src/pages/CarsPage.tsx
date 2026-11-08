import type { CarSummary } from '@raceshop/api-client';
import { DataTable, Spinner } from '@raceshop/ui';
import type { Column } from '@raceshop/ui';

import { useCars } from '../api/inventory';
import styles from '../app.module.css';
import { usePageTitle } from '../usePageTitle';
import { QueryError } from './StatusPages';

const columns: readonly Column<CarSummary>[] = [
  { key: 'number', header: 'Car', render: (car) => `#${car.carNumber}` },
  { key: 'team', header: 'Team', render: (car) => car.team },
  { key: 'chassis', header: 'Chassis', render: (car) => car.chassisId },
];

export function CarsPage() {
  usePageTitle('Cars');
  const cars = useCars();

  return (
    <div className={styles.page}>
      <h1>Cars</h1>
      {cars.isPending && <Spinner label="Loading cars" />}
      {cars.isError && <QueryError error={cars.error} what="cars" />}
      {cars.data && (
        <DataTable caption="Cars" columns={columns} rows={cars.data} getRowKey={(car) => car.id} />
      )}
    </div>
  );
}
