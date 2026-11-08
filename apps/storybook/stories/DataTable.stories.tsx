import type { Meta, StoryObj } from '@storybook/react-vite';

import { DataTable, LifeGauge, StatusBadge } from '@raceshop/ui';
import type { Column } from '@raceshop/ui';

interface Serial {
  id: string;
  serial: string;
  status: 'In stock' | 'Installed';
  percent: number;
  car: string;
}

const rows: Serial[] = [
  { id: '1', serial: 'BR380-0001', status: 'Installed', percent: 24, car: '#24' },
  { id: '2', serial: 'BR380-0002', status: 'In stock', percent: 82, car: '—' },
  { id: '3', serial: 'BR380-0003', status: 'In stock', percent: 101, car: '—' },
];

const columns: Column<Serial>[] = [
  { key: 'serial', header: 'Serial number', render: (row) => row.serial },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <StatusBadge tone={row.status === 'Installed' ? 'ok' : 'info'}>{row.status}</StatusBadge>
    ),
  },
  {
    key: 'life',
    header: 'Life used',
    render: (row) => <LifeGauge percent={row.percent} label={`Life used, ${row.serial}`} />,
  },
  { key: 'car', header: 'On car', render: (row) => row.car },
];

const meta = {
  title: 'Data/DataTable',
  component: DataTable<Serial>,
  args: { caption: 'Serialized parts (3)', columns, rows, getRowKey: (row: Serial) => row.id },
} satisfies Meta<typeof DataTable<Serial>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SerializedParts: Story = {};
export const Empty: Story = { args: { rows: [], emptyMessage: 'No parts match this search.' } };
/** On a phone the table scrolls inside its own region; the page itself never scrolls sideways. */
export const PhoneWidth: Story = { globals: { viewport: { value: 'mobile1' } } };
