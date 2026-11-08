import { Component, Host, Prop, h } from '@stencil/core';
import type { VNode } from '@stencil/core';

import { arcPoint, formatPercent, statusFor, statusLabel, WARNING_PERCENT } from '../../utils/life';
import type { LifeStatus } from '../../utils/life';

const ARC = 'M 10 60 A 50 50 0 0 1 110 60';
const tickInner = arcPoint(WARNING_PERCENT / 100, 43);
const tickOuter = arcPoint(WARNING_PERCENT / 100, 57);

/**
 * How much of a serialized part's life is used, as a half-circle gauge with the 80% warning mark.
 * A standard custom element, so it works the same in React, Electron and plain HTML (ADR 0007).
 *
 * Accessibility: exposed as `role="meter"` with a text alternative that includes the status, and
 * the status is printed as text, so colour is never the only signal.
 *
 * @cssprop --rs-color-ok - Arc colour below 80%.
 * @cssprop --rs-color-warning - Arc and label colour from 80% to under 100%.
 * @cssprop --rs-color-danger - Arc and label colour at 100% or more.
 * @cssprop --rs-color-gauge-track - Unused part of the arc.
 */
@Component({ tag: 'life-gauge', styleUrl: 'life-gauge.css', shadow: true })
export class LifeGauge {
  /** Life used, in percent. Values above 100 draw a full arc but show the real number. */
  @Prop() percent = 0;

  /** Status from the API. When omitted, it is derived from `percent` with the API's thresholds. */
  @Prop() status?: LifeStatus;

  /** Accessible name, e.g. "Life used, BR380-0002". */
  @Prop() label = 'Life used';

  @Prop({ reflect: true }) size: 'small' | 'large' = 'small';

  render(): VNode {
    const status = this.status ?? statusFor(this.percent);
    const filled = Math.min(Math.max(this.percent, 0), 100);
    const percentText = formatPercent(this.percent);

    return (
      <Host>
        <div
          class={`gauge ${status.toLowerCase()}`}
          role="meter"
          aria-label={this.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={filled}
          aria-valuetext={`${percentText} used, ${statusLabel[status]}`}
        >
          <svg viewBox="0 0 120 66" aria-hidden="true" focusable="false">
            <path class="track" d={ARC} pathLength={100} />
            {filled > 0 && (
              <path class="fill" d={ARC} pathLength={100} stroke-dasharray={`${filled} 100`} />
            )}
            <line
              class="tick"
              x1={tickInner.x}
              y1={tickInner.y}
              x2={tickOuter.x}
              y2={tickOuter.y}
            />
          </svg>
          <span class="value">{percentText}</span>
          <span class="status">{statusLabel[status]}</span>
        </div>
      </Host>
    );
  }
}
