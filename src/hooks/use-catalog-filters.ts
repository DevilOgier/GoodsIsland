'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const keys = ['q', 'ip', 'character', 'series', 'tag', 'type', 'status'] as const;
type FilterKey = (typeof keys)[number];
type Filters = Record<FilterKey, string>;

function readFilters(params: URLSearchParams): Filters {
  return Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ''])) as Filters;
}

export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(() =>
    readFilters(new URLSearchParams(searchParams.toString())),
  );
  const currentQuery = searchParams.toString();
  const hydratedQuery = useRef(currentQuery);

  useEffect(() => {
    hydratedQuery.current = currentQuery;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser navigation is an external URL state change.
    setFilters(readFilters(new URLSearchParams(currentQuery)));
  }, [pathname, currentQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(hydratedQuery.current);
      for (const key of keys) {
        if (filters[key]) next.set(key, filters[key]);
        else next.delete(key);
      }
      const nextQuery = next.toString();
      if (nextQuery !== currentQuery)
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [filters, currentQuery, pathname, router]);

  const setFilter = useCallback(
    (key: FilterKey) => (value: string) => setFilters((current) => ({ ...current, [key]: value })),
    [],
  );

  return {
    ...filters,
    setQ: setFilter('q'),
    setIp: setFilter('ip'),
    setCharacter: setFilter('character'),
    setSeries: setFilter('series'),
    setTag: setFilter('tag'),
    setType: setFilter('type'),
    setStatus: setFilter('status'),
  };
}
