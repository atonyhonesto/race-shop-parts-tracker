import type { Meta, StoryObj } from '@storybook/react-vite';

import { Alert, Spinner, StatusBadge, VisuallyHidden } from '@raceshop/ui';

const meta = {
  title: 'Feedback/StatusBadge',
  component: StatusBadge,
  args: { tone: 'warning', children: 'Near limit' },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Warning: Story = {};

export const AllTones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <StatusBadge tone="neutral">Retired</StatusBadge>
      <StatusBadge tone="info">In stock</StatusBadge>
      <StatusBadge tone="ok">Installed</StatusBadge>
      <StatusBadge tone="warning">Near limit</StatusBadge>
      <StatusBadge tone="danger">Expired</StatusBadge>
    </div>
  ),
};

/** Errors and warnings are role="alert"; success and info are role="status". */
export const Alerts: StoryObj<typeof Alert> = {
  render: () => (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <Alert tone="ok" title="Installed" />
      <Alert tone="warning" title="Installed, near life limit">
        This part has used 85% of its life. Plan a replacement.
      </Alert>
      <Alert tone="danger" title="Install failed">
        Part BR380-0002 is already installed on another car. Remove it first.
      </Alert>
      <Alert tone="info" title="Development sign-in">
        No Entra ID tenant needed.
      </Alert>
    </div>
  ),
};

export const Loading: StoryObj<typeof Spinner> = {
  render: () => <Spinner label="Loading parts" />,
};

/** Text for screen readers only, e.g. extra context for an icon button. */
export const ScreenReaderOnlyText: StoryObj<typeof VisuallyHidden> = {
  render: () => (
    <p>
      Visible text<VisuallyHidden> and text only screen readers announce</VisuallyHidden>.
    </p>
  ),
};
