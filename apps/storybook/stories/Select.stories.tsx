import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select } from '@raceshop/ui';

const meta = {
  title: 'Controls/Select',
  component: Select,
  args: {
    label: 'Car',
    placeholder: 'Choose a car',
    options: [
      { value: '24', label: '#24 (Red Line Racing)' },
      { value: '48', label: '#48 (Red Line Racing)' },
    ],
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithError: Story = { args: { error: 'Choose a car.' } };
