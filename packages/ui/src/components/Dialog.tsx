import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  /** Called when the user closes the dialog (Esc, or a Cancel button that calls it). */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Action buttons, rendered right-aligned. */
  footer?: ReactNode;
}

/**
 * A modal built on the native <dialog> element. The browser traps focus, closes on Esc, makes the
 * page behind it inert, and returns focus to the element that opened it (WCAG 2.1.2, 2.4.3).
 */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
