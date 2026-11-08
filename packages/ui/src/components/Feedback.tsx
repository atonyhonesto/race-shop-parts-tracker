import type { ReactNode } from 'react';

import { cx } from '../cx';
import styles from './Feedback.module.css';

export type Tone = 'neutral' | 'info' | 'ok' | 'warning' | 'danger';

/** A short status label. The text carries the meaning; colour only reinforces it (WCAG 1.4.1). */
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cx(styles.badge, tone !== 'neutral' && styles[tone])}>{children}</span>;
}

export interface AlertProps {
  tone: Exclude<Tone, 'neutral'>;
  title: string;
  children?: ReactNode;
}

/**
 * Errors and warnings use role="alert" (announced immediately); success and info use
 * role="status" (announced politely), so screen reader users hear results without losing their place.
 */
export function Alert({ tone, title, children }: AlertProps) {
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <div role={urgent ? 'alert' : 'status'} className={cx(styles.alert, styles[tone])}>
      <span className={styles.alertTitle}>{title}</span>
      {children && <div>{children}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className={styles.spinner}>
      <span className={styles.visuallyHidden}>{label}</span>
    </span>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className={styles.visuallyHidden}>{children}</span>;
}
