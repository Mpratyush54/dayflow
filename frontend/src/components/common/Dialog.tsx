import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Dialog({ open, onClose, title, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open, { initialFocus: panelRef });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="dialog animate-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog__head">
          <h2 id={titleId} className="dialog__title">{title}</h2>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="dialog__body">{children}</div>
      </div>
    </div>
  );
}
