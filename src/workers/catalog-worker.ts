import {
  acquireCatalogLease,
  queuedCatalogs,
  readCatalogRecord,
  catalogCycle,
  type CatalogResult,
} from '../infrastructure/catalog-export-store';
import {
  enqueueDefaultCatalogs,
  generateCatalog,
  catalogNeedsRefresh,
} from '../domain/catalog-export-service';
let cycle = '';
console.log('图鉴长图 worker 已启动；每天北京时间 03:00 检查更新');
while (true) {
  const release = await acquireCatalogLease();
  if (release)
    try {
      const next = catalogCycle();
      if (next !== cycle) {
        await enqueueDefaultCatalogs();
        cycle = next;
      }
      for (const key of await queuedCatalogs()) {
        const state = await readCatalogRecord<CatalogResult>(key, 'result');
        if (catalogNeedsRefresh(state)) await generateCatalog(key);
      }
    } catch (error) {
      console.error('catalog-worker:', error instanceof Error ? error.message : error);
    } finally {
      await release();
    }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
