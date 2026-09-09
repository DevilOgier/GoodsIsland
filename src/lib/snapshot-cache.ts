export function createSnapshotCache<T>(ttl = 30_000) {
  const entries = new Map<string, { value: T; expires: number }>();
  let generation = 0;
  return {
    clear() {
      generation++;
      entries.clear();
    },
    async load(key: string, fetcher: () => Promise<T>, force = false): Promise<T> {
      const cached = entries.get(key);
      if (!force && cached && cached.expires > Date.now()) return cached.value;
      const current = ++generation;
      const value = await fetcher();
      if (current === generation) {
        entries.clear();
        entries.set(key, { value, expires: Date.now() + ttl });
      }
      return value;
    },
  };
}
