import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextField } from '@raceshop/ui';

const meta = {
  title: 'Controls/TextField',
  component: TextField,
  args: { label: 'Miles since install' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = { args: { hint: "Added to the part's total of 120 mi." } };
export const WithError: Story = {
  args: {
    hint: "Added to the part's total of 120 mi.",
    error: 'Enter the miles run on this car (0 or more).',
    defaultValue: '-5',
  },
};
