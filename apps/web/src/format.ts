import type { LifeStatus, LifeUnit, PartStatus } from '@raceshop/api-client';
import type { Tone } from '@raceshop/ui';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export const formatNumber = (value: number) => number.format(value);
export const formatCost = (value: number) => currency.format(value);
export const formatDateTime = (value: string) => dateTime.format(new Date(value));

const unitLabels: Record<LifeUnit, { short: string; long: string }> = {
  Miles: { short: 'mi', long: 'miles' },
  Hours: { short: 'h', long: 'hours' },
};

export const formatUsage = (value: number, unit: LifeUnit) =>
  `${number.format(value)} ${unitLabels[unit].short}`;
export const unitName = (unit: LifeUnit) => unitLabels[unit].long;

export const partStatus: Record<PartStatus, { label: string; tone: Tone }> = {
  InStock: { label: 'In stock', tone: 'info' },
  Installed: { label: 'Installed', tone: 'ok' },
  Retired: { label: 'Retired', tone: 'neutral' },
};

export const lifeStatus: Record<LifeStatus, { label: string; tone: Tone }> = {
  Ok: { label: 'OK', tone: 'ok' },
  Warning: { label: 'Near limit', tone: 'warning' },
  Expired: { label: 'Expired', tone: 'danger' },
};
