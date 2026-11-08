import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Alert, AppShell, Dialog, StatusBadge, ThemeToggle } from '../src';
import userEvent from '@testing-library/user-event';

describe('Dialog', () => {
  it('opens as a dialog named by its title', () => {
    render(
      <Dialog open title="Install part" onClose={vi.fn()}>
        body
      </Dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Install part' })).toBeVisible();
  });

  it('reports a close (Esc or a Cancel button) through onClose', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open title="Install part" onClose={onClose}>
        body
      </Dialog>,
    );

    rerender(
      <Dialog open={false} title="Install part" onClose={onClose}>
        body
      </Dialog>,
    );

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('Alert and StatusBadge', () => {
  it('announces errors immediately and successes politely', () => {
    render(
      <>
        <Alert tone="danger" title="Install failed" />
        <Alert tone="ok" title="Installed" />
      </>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Install failed');
    expect(screen.getByRole('status')).toHaveTextContent('Installed');
  });

  it('shows status as text', () => {
    render(<StatusBadge tone="warning">Near limit</StatusBadge>);

    expect(screen.getByText('Near limit')).toBeInTheDocument();
  });
});

describe('AppShell', () => {
  it('provides a skip link to a focusable main landmark and a named navigation', () => {
    render(
      <AppShell
        appName="Race Shop"
        navItems={[
          <a key="parts" href="/parts">
            Parts
          </a>,
        ]}
      >
        content
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('navigation', { name: 'Main' })).toContainElement(
      screen.getByRole('link', { name: 'Parts' }),
    );
  });
});

describe('ThemeToggle', () => {
  it('applies the chosen theme to <html> and back to the OS setting', async () => {
    render(<ThemeToggle />);
    const select = screen.getByRole('combobox', { name: 'Theme' });

    await userEvent.selectOptions(select, 'Dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await userEvent.selectOptions(select, 'System');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
