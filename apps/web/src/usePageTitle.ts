import { useEffect } from 'react';

/** Each page gets a unique, descriptive document title (WCAG 2.4.2). */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · Race Shop Parts Tracker`;
  }, [title]);
}
