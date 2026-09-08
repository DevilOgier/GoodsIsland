import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
mkdirSync('.local', { recursive: true });
if (!existsSync('.env')) {
  const password = randomBytes(24).toString('hex');
  writeFileSync(
    '.env',
    [
      'DATABASE_URL=postgresql://guzi:' + password + '@127.0.0.1:54329/guzi',
      'APP_URL=http://localhost:3000',
      'AUTH_SECRET=' + randomBytes(32).toString('hex'),
      'S3_ENDPOINT=http://127.0.0.1:9000',
      'S3_BUCKET=guzi',
      'S3_ACCESS_KEY=S3RVER',
      'S3_SECRET_KEY=S3RVER',
      'S3_REGION=us-east-1',
      'S3_FORCE_PATH_STYLE=true',
      'IMAGE_ENHANCEMENT_PROVIDER=mock',
      'IMAGE_ENHANCEMENT_API_KEY=',
      'IMAGE_ENHANCEMENT_MODEL=High Fidelity V2',
      'LOCAL_SERVICES=true',
      'COOKIE_SECURE=false',
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  console.log('本地配置已生成（随机数据库密码保存在 .env）。');
} else console.log('保留现有 .env。');
