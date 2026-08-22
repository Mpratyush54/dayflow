import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** URL-synced search param with debounced writes (default 300ms). Resets page on change. */
export function useDebouncedSearchParam(name = 'q', delayMs = 300) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlValue = searchParams.get(name) ?? '';
  const [input, setInput] = useState(urlValue);

  useEffect(() => {
    setInput(urlValue);
  }, [urlValue]);

  useEffect(() => {
    if (input === urlValue) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = input.trim();
      if (trimmed) next.set(name, trimmed);
      else next.delete(name);
      next.delete('page');
      setSearchParams(next, { replace: true });
    }, delayMs);
    return () => clearTimeout(t);
  }, [input, urlValue, name, delayMs, searchParams, setSearchParams]);

  return { input, setInput, debounced: urlValue };
}

/** Update page param while preserving other search params */
export function setPageParam(
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  page: number,
) {
  const next = new URLSearchParams(searchParams);
  if (page <= 1) next.delete('page');
  else next.set('page', String(page));
  setSearchParams(next, { replace: true });
}
