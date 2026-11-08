import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

import { cx } from '../cx';
import styles from './Field.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'children'
> {
  label: string;
  options: readonly SelectOption[];
  /** Shown as a first, empty option. */
  placeholder?: string;
  error?: string | undefined;
}

/** A native <select>: keyboard, screen readers and phone pickers work without extra code. */
export function Select({ label, options, placeholder, error, className, ...props }: SelectProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.control}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
