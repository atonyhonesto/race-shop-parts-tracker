import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppShell, Button, ThemeToggle } from '@raceshop/ui';

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  args: {
    appName: 'Race Shop Parts Tracker',
    navItems: [
      <a key="parts" href="#parts" aria-current="page">
        Parts
      </a>,
      <a key="cars" href="#cars">
        Cars
      </a>,
    ],
    actions: (
      <>
        <ThemeToggle />
        <Button>Sign out</Button>
      </>
    ),
    children: (
      <>
        <h1>Parts</h1>
        <p>Press Tab once to see the skip link.</p>
      </>
    ),
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
