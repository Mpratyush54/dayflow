import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start;
      if (elapsed < 0) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf.current);
    };
  }, [target, duration, delay]);

  return value;
}
