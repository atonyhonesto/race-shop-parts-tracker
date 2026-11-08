import type { Meta, StoryObj } from '@storybook/react-vite';

import { LifeGauge } from '@raceshop/ui';

/**
 * React wrapper around the `<life-gauge>` web component from packages/ui-wc (Stencil). The same
 * element runs in the Electron app and in plain HTML (packages/ui-wc/src/index.html, ADR 0007).
 */
const meta = {
  title: 'Data/LifeGauge',
  component: LifeGauge,
  args: { percent: 42, label: 'Life used, BR380-0001', size: 'small' },
  argTypes: {
    percent: { control: { type: 'range', min: 0, max: 130, step: 1 } },
    status: { control: 'inline-radio', options: [undefined, 'Ok', 'Warning', 'Expired'] },
    size: { control: 'inline-radio', options: ['small', 'large'] },
  },
} satisfies Meta<typeof LifeGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ok: Story = {};
export const NearLimit: Story = { args: { percent: 85, label: 'Life used, BR380-0002' } };
export const Expired: Story = { args: { percent: 101, label: 'Life used, BR380-0003' } };
export const Large: Story = { args: { percent: 82, size: 'large' } };

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
      <LifeGauge percent={24} label="Life used, part A" />
      <LifeGauge percent={80} label="Life used, part B" />
      <LifeGauge percent={100} label="Life used, part C" />
    </div>
  ),
};
