import type { Meta, StoryObj } from '@storybook/react-vite';

import { ThemeToggle } from '@raceshop/ui';

const meta = {
  title: 'Controls/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    docs: {
      description: {
        component: 'Light by default; System follows the OS; the choice is remembered per device.',
      },
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
