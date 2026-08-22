import { useEffect, useState } from 'react';

/** Simulates data arrival so skeleton states are visible (remove once APIs are wired). */
export function useDelayedReady(ms = 650) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}
