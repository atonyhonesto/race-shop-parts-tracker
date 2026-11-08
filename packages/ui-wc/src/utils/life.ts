/** Matches the API's LifeStatus enum. */
export type LifeStatus = 'Ok' | 'Warning' | 'Expired';

/** Same thresholds as the domain (LifeLimit.WarningThreshold and 100%). */
export const WARNING_PERCENT = 80;
export const LIMIT_PERCENT = 100;

export function statusFor(percent: number): LifeStatus {
  if (percent >= LIMIT_PERCENT) return 'Expired';
  if (percent >= WARNING_PERCENT) return 'Warning';
  return 'Ok';
}

const percentFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function formatPercent(percent: number): string {
  return `${percentFormat.format(percent)}%`;
}

/** Short visible label. The status is always shown as text, never by colour alone (WCAG 1.4.1). */
export const statusLabel: Readonly<Record<LifeStatus, string>> = {
  Ok: 'OK',
  Warning: 'Near limit',
  Expired: 'Expired',
};

/** Point on the gauge arc (centre 60,60) at a fraction of the half circle, for the 80% tick. */
export function arcPoint(fraction: number, radius: number): { x: number; y: number } {
  const angle = Math.PI - Math.PI * fraction;
  return { x: 60 + radius * Math.cos(angle), y: 60 - radius * Math.sin(angle) };
}
