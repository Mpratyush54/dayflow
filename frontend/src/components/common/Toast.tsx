import type { ToastItem } from '../../hooks/useToasts';

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      className="toast-stack"
      role="region"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  );
}
