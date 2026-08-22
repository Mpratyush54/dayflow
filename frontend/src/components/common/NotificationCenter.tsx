import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationKind } from '../../context/notification-context';

const PANEL_WIDTH = 320;
const PANEL_GAP = 8;
const VIEWPORT_PAD = 16;

const KIND_ICON: Record<NotificationKind, string> = {
  'leave-approved': '✓',
  'leave-rejected': '✕',
  'payroll-ready': '💵',
  'check-in-reminder': '🗓',
  'pending-approval': '✓',
};

function relativeTime(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export default function NotificationCenter() {
  const titleId = useId();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const maxHeight = Math.min(420, window.innerHeight * 0.6);

      let left = rect.left;
      let top = rect.bottom + PANEL_GAP;

      if (left + PANEL_WIDTH > window.innerWidth - VIEWPORT_PAD) {
        left = window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD;
      }
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

      if (top + maxHeight > window.innerHeight - VIEWPORT_PAD) {
        top = rect.top - maxHeight - PANEL_GAP;
      }
      if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;

      setPanelPos({ top, left });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (panelRef.current) trapFocus(panelRef.current, e);
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      if (prev && rootRef.current?.contains(prev)) prev.focus();
      else triggerRef.current?.focus();
    };
  }, [open]);

  function handleItemClick(id: string, href: string) {
    markAsRead(id);
    setOpen(false);
    navigate(href);
  }

  const badgeLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : undefined;

  return (
    <div className="notif-center" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="notif-center__trigger"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="notif-center__bell" aria-hidden>
          🔔
        </span>
        {badgeLabel && (
          <span className="notif-center__badge" aria-hidden>
            {badgeLabel}
          </span>
        )}
      </button>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          className="notif-center__panel notif-center__panel--fixed animate-in"
          style={{ top: panelPos.top, left: panelPos.left }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
        >
          <div className="notif-center__head">
            <h2 id={titleId} className="notif-center__title">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <button type="button" className="notif-center__mark-all" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="notif-center__empty">You&apos;re all caught up — no notifications yet.</p>
          ) : (
            <ul className="notif-center__list" role="list">
              {notifications.map((n) => (
                <li key={n.id} role="listitem">
                  <button
                    type="button"
                    className={`notif-center__item ${n.read ? '' : 'is-unread'}`}
                    onClick={() => handleItemClick(n.id, n.href)}
                  >
                    <span className="notif-center__icon" aria-hidden>
                      {KIND_ICON[n.kind]}
                    </span>
                    <span className="notif-center__body">
                      <span className="notif-center__item-title">{n.title}</span>
                      <span className="notif-center__message">{n.message}</span>
                      <span className="notif-center__time">{relativeTime(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="notif-center__dot" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="notif-center__foot">
            <Link to="/dashboard" className="notif-center__foot-link" onClick={() => setOpen(false)}>
              Go to dashboard
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
