import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from '@raceshop/ui';

const meta = {
  title: 'Controls/Button',
  component: Button,
  args: { children: 'Install on a car', onClick: fn() },
  argTypes: { variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger'] } },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Cancel' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Retire part' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };
