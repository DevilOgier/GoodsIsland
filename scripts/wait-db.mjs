import pg from 'pg';
let ready = false;
for (let attempt = 0; attempt < 40; attempt++) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 1000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    ready = true;
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  } finally {
    await client.end().catch(() => {});
  }
}
if (!ready) {
  console.error('数据库尚未就绪，请检查 .local/services-error.log');
  process.exit(1);
}
console.log('数据库已就绪');
