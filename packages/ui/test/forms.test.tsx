import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, Select, TextField } from '../src';

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('calls onClick from keyboard activation', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Install</Button>);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('TextField', () => {
  it('is reachable by its visible label', () => {
    render(<TextField label="Miles since install" />);

    expect(screen.getByLabelText('Miles since install')).toBeInTheDocument();
  });

  it('marks the input invalid and describes it with the error and hint', () => {
    render(<TextField label="Miles" hint="Miles run on this car" error="Enter 0 or more" />);

    const input = screen.getByLabelText('Miles');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Miles run on this car Enter 0 or more');
  });

  it('is not marked invalid without an error', () => {
    render(<TextField label="Search" />);

    expect(screen.getByLabelText('Search')).not.toHaveAttribute('aria-invalid');
  });
});

describe('Select', () => {
  it('renders a labelled native select with a placeholder option', async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Car"
        placeholder="Choose a car"
        options={[
          { value: 'a', label: '#24' },
          { value: 'b', label: '#48' },
        ]}
        onChange={onChange}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Car' });
    await userEvent.selectOptions(select, '#48');

    expect(select).toHaveValue('b');
    expect(screen.getByRole('option', { name: 'Choose a car' })).toHaveValue('');
    expect(onChange).toHaveBeenCalledOnce();
  });
});
