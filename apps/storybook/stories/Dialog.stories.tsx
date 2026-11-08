import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button, Dialog, Select } from '@raceshop/ui';

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  args: { open: false, title: 'Install BR380-0002', onClose: () => undefined, children: null },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open it, then try Tab (focus stays inside) and Esc (closes and returns focus to the button). */
export const InstallDialog: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button
          variant="primary"
          onClick={() => {
            setOpen(true);
          }}
        >
          Install on a car
        </Button>
        <Dialog
          {...args}
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          footer={
            <>
              <Button
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Install
              </Button>
            </>
          }
        >
          <Select
            label="Car"
            placeholder="Choose a car"
            options={[
              { value: '24', label: '#24 (Red Line Racing)' },
              { value: '48', label: '#48 (Red Line Racing)' },
            ]}
          />
        </Dialog>
      </>
    );
  },
};
