import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Pagination } from '@raceshop/ui';

const meta = {
  title: 'Data/Pagination',
  component: Pagination,
  args: {
    page: 1,
    pageSize: 25,
    totalCount: 1234,
    itemLabel: 'parts',
    onPageChange: () => undefined,
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: function Render(args) {
    const [page, setPage] = useState(args.page);
    return <Pagination {...args} page={page} onPageChange={setPage} />;
  },
};
export const LastPage: Story = { args: { page: 50 } };
