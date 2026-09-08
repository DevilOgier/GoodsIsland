process.env.HOSTNAME = process.env.WEB_HOST ?? '127.0.0.1';
process.env.PORT = process.env.PORT ?? '3000';
process.env.NEXT_TELEMETRY_DISABLED = '1';
await import('../.next/standalone/server.js');
