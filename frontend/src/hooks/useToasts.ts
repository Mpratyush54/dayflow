import { useCallback, useRef, useState } from 'react';

export interface ToastItem {
  id: number;
  text: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const push = useCallback((text: string) => {
    const id = next.current++;
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  return { toasts, push };
}
