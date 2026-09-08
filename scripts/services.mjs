import EmbeddedPostgres from 'embedded-postgres';
import S3rver from 's3rver';
import { createConnection } from 'node:net';
async function listening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
if (process.env.LOCAL_SERVICES !== 'true')
  throw new Error('本地服务仅在 LOCAL_SERVICES=true 时启动');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname))
  throw new Error('拒绝为远程数据库启动本地服务');
const databaseDir = resolve('.local/postgres');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
  authMethod: 'scram-sha-256',
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: console.error,
});
if (!existsSync(databaseDir + '/PG_VERSION')) await pg.initialise();
const ownsPg = !(await listening(Number(url.port)));
if (ownsPg) await pg.start();
const client = pg.getPgClient();
await client.connect();
const database = url.pathname.slice(1);
if (!/^[a-z_]+$/.test(database)) throw new Error('Invalid local database name');
if (!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount)
  await pg.createDatabase(database);
await client.end();
mkdirSync('.local/objects', { recursive: true });
const s3 = new S3rver({
  port: 9000,
  address: '127.0.0.1',
  silent: true,
  directory: resolve('.local/objects'),
  configureBuckets: [
    {
      name: process.env.S3_BUCKET,
      configs: [
        Buffer.from(
          '<CORSConfiguration><CORSRule><AllowedOrigin>' +
            process.env.APP_URL +
            '</AllowedOrigin><AllowedMethod>PUT</AllowedMethod><AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader></CORSRule></CORSConfiguration>',
        ),
      ],
    },
  ],
});
const ownsS3 = !(await listening(9000));
if (ownsS3) await s3.run();
writeFileSync('.local/services.pid', String(process.pid));
console.log('PostgreSQL ' + url.hostname + ':' + url.port + ' / S3 127.0.0.1:9000 已启动');
async function stop() {
  if (ownsS3) await s3.close();
  if (ownsPg) await pg.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
