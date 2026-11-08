import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LifeGauge } from '../src';

/** Stencil renders asynchronously inside the element's shadow root. */
async function meterOf(container: HTMLElement): Promise<Element> {
  await customElements.whenDefined('life-gauge');
  for (let attempt = 0; attempt < 10; attempt++) {
    const meter = container
      .querySelector('life-gauge')
      ?.shadowRoot?.querySelector('[role="meter"]');
    if (meter) return meter;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  throw new Error('life-gauge did not render');
}

describe('LifeGauge (React wrapper for the <life-gauge> web component)', () => {
  it('passes props through to the element as properties', async () => {
    const { container } = render(
      <LifeGauge percent={85} status="Warning" label="Life used, BR380-0002" />,
    );

    const meter = await meterOf(container);

    expect(meter).toHaveAttribute('aria-label', 'Life used, BR380-0002');
    expect(meter).toHaveAttribute('aria-valuetext', '85% used, Near limit');
  });

  it('updates the element when React re-renders with a new value', async () => {
    const { container, rerender } = render(<LifeGauge percent={10} label="Life used" />);
    await meterOf(container);

    rerender(<LifeGauge percent={100} label="Life used" />);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(await meterOf(container)).toHaveAttribute('aria-valuetext', '100% used, Expired');
  });
});
