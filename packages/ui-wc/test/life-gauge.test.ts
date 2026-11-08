import { afterEach, describe, expect, it } from 'vitest';

// The compiled element, exactly what packages/ui and the Electron app import.
import '../dist/components/life-gauge.js';

type LifeGaugeElement = HTMLElement & { percent: number; status?: string; label: string };

async function renderGauge(attributes: Record<string, string>): Promise<HTMLElement> {
  const element = document.createElement('life-gauge');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  await customElements.whenDefined('life-gauge');
  await settle();
  const meter = element.shadowRoot?.querySelector<HTMLElement>('[role="meter"]');
  if (!meter) throw new Error('life-gauge did not render a meter');
  return meter;
}

/** Stencil renders asynchronously; give it a couple of frames. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => setTimeout(resolve, 16));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<life-gauge>', () => {
  it('exposes an accessible meter with value and text alternative', async () => {
    const meter = await renderGauge({ percent: '85', label: 'Life used, BR380-0002' });

    expect(meter.getAttribute('aria-label')).toBe('Life used, BR380-0002');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('aria-valuenow')).toBe('85');
    expect(meter.getAttribute('aria-valuetext')).toBe('85% used, Near limit');
  });

  it('shows the status as text, not only colour', async () => {
    const meter = await renderGauge({ percent: '101' });

    expect(meter.querySelector('.status')?.textContent).toBe('Expired');
    expect(meter.querySelector('.value')?.textContent).toBe('101%');
    expect(meter.classList.contains('expired')).toBe(true);
  });

  it('caps aria-valuenow at 100 when a part is past its limit', async () => {
    const meter = await renderGauge({ percent: '130' });

    expect(meter.getAttribute('aria-valuenow')).toBe('100');
  });

  it('prefers the status the API sends over its own calculation', async () => {
    const meter = await renderGauge({ percent: '50', status: 'Warning' });

    expect(meter.querySelector('.status')?.textContent).toBe('Near limit');
  });

  it('re-renders when the percent property changes', async () => {
    await renderGauge({ percent: '10' });
    const element = document.querySelector('life-gauge') as LifeGaugeElement;

    element.percent = 90;
    await settle();

    const meter = element.shadowRoot?.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuenow')).toBe('90');
    expect(meter?.classList.contains('warning')).toBe(true);
  });
});
