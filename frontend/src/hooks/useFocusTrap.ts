import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options?: { initialFocus?: RefObject<HTMLElement | null>; restoreFocus?: boolean },
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const trap = container;
    const initial = options?.initialFocus?.current;
    const focusable = getFocusableElements(trap);
    const focusTarget: HTMLElement = initial ?? focusable[0] ?? trap;
    focusTarget.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const items = getFocusableElements(trap);
      if (items.length === 0) {
        e.preventDefault();
        trap.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        if (current === first || !items.includes(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !items.includes(current)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (options?.restoreFocus !== false) {
        previousFocusRef.current?.focus();
      }
    };
  }, [active, containerRef, options?.initialFocus, options?.restoreFocus]);
}
