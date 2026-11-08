import { useEffect, useState } from 'react';

import { Select } from './Select';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'raceshop.theme';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system'; // storage blocked (private mode, policy): fall back to the OS setting
  }
}

/** Applies a theme by setting data-theme on <html>; tokens.css does the rest. */
export function applyTheme(preference: ThemePreference): void {
  if (preference === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = preference;
}

const options = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

/** Light is the default; dark follows the OS unless the user picks one here. Remembered per device. */
export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    applyTheme(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Not persisting is fine; the choice still applies for this session.
    }
  }, [preference]);

  return (
    <Select
      label="Theme"
      options={options}
      value={preference}
      onChange={(event) => {
        setPreference(event.target.value as ThemePreference);
      }}
    />
  );
}
