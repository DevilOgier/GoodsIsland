import { mkdir, readFile, writeFile, rename, readdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
export type CatalogRecipe = {
  type: string;
  character: string;
  ids?: string[];
  title: string;
  showDate: boolean;
};
export type CatalogResult = {
  key: string;
  title: string;
  count: number;
  generatedAt: string;
  fingerprint: string;
  error?: string;
  retryAfter?: string;
};
export const catalogVersion = 'long-v1';
export function recipeKey(recipe: CatalogRecipe) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        version: catalogVersion,
        ...recipe,
        ids: recipe.ids ? [...recipe.ids].sort() : undefined,
      }),
    )
    .digest('hex');
}
export function catalogDirectory() {
  return resolve(
    process.env.CATALOG_EXPORT_DIR ??
      resolve(process.env.STORAGE_LOCAL_DIR ?? '.local/assets', 'catalog-jobs'),
  );
}
function file(key: string, kind: string) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw Error('Invalid catalog key');
  return resolve(catalogDirectory(), key + '.' + kind + '.json');
}
export async function readCatalogRecord<T>(
  key: string,
  kind: 'request' | 'result',
): Promise<T | null> {
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ file(key, kind), 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export async function enqueueCatalog(recipe: CatalogRecipe) {
  await mkdir(catalogDirectory(), { recursive: true });
  const key = recipeKey(recipe);
  try {
    await writeFile(file(key, 'request'), JSON.stringify(recipe), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  return key;
}
export async function saveCatalogResult(key: string, result: CatalogResult) {
  const target = file(key, 'result'),
    temp = target + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, JSON.stringify(result), { mode: 0o600 });
    await rename(temp, target);
  } finally {
    await unlink(temp).catch(() => {});
  }
}
export async function queuedCatalogs() {
  await mkdir(catalogDirectory(), { recursive: true });
  return (await readdir(/* turbopackIgnore: true */ catalogDirectory()))
    .filter((n) => /^[a-f0-9]{64}\.request\.json$/.test(n))
    .map((n) => n.split('.')[0]);
}
// One catalog worker per shared volume. The heartbeat makes interrupted work recoverable.
export async function acquireCatalogLease() {
  await mkdir(catalogDirectory(), { recursive: true });
  const target = resolve(catalogDirectory(), 'worker.lock');
  try {
    const m = await stat(target);
    if (Date.now() - m.mtimeMs > 120000) await unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    const handle = await import('node:fs/promises').then((fs) => fs.open(target, 'wx'));
    const timer = setInterval(
      () => void handle.utimes(new Date(), new Date()).catch(() => {}),
      30000,
    );
    return async () => {
      clearInterval(timer);
      await handle.close();
      await unlink(target).catch(() => {});
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return null;
    throw error;
  }
}
export function catalogCycle(now = new Date()) {
  // 03:00 Asia/Shanghai, represented as UTC+8 without depending on host timezone.
  return new Date(now.getTime() + 5 * 3600000).toISOString().slice(0, 10);
}
