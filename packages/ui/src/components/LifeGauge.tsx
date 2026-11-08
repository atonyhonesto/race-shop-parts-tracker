// Registers <life-gauge> (the Stencil web component from packages/ui-wc, ADR 0007).
import '@raceshop/ui-wc/life-gauge';

import type { HTMLAttributes } from 'react';

export type LifeStatus = 'Ok' | 'Warning' | 'Expired';

export interface LifeGaugeProps {
  /** Life used, in percent. */
  percent: number;
  /** Status from the API. When omitted, the element derives it with the same thresholds. */
  status?: LifeStatus | undefined;
  /** Accessible name, e.g. "Life used, BR380-0002". */
  label: string;
  size?: 'small' | 'large';
}

type LifeGaugeElementProps = HTMLAttributes<HTMLElement> & LifeGaugeProps;

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- JSX typing for a custom element
  namespace JSX {
    interface IntrinsicElements {
      'life-gauge': LifeGaugeElementProps;
    }
  }
}

/**
 * React wrapper for <life-gauge>. React 19 passes these props to the element as properties,
 * so no wrapper library is needed. This component only adds types and a stable React API.
 */
export function LifeGauge({ percent, status, label, size = 'small' }: LifeGaugeProps) {
  return <life-gauge percent={percent} status={status} label={label} size={size} />;
}
