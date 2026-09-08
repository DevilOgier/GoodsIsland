import sharp from 'sharp';
export class UnknownSubmission extends Error {}
export interface ImageEnhancementInput {
  bytes: Buffer;
  processId?: string;
  onSubmitted: (id: string) => Promise<void>;
  heartbeat: () => Promise<void>;
}
export interface ImageEnhancementResult {
  bytes: Buffer;
  isMock: boolean;
}
export interface ImageEnhancementService {
  enhance(input: ImageEnhancementInput): Promise<ImageEnhancementResult>;
}
export class MockImageEnhancementService implements ImageEnhancementService {
  async enhance({ bytes }: ImageEnhancementInput) {
    const meta = await sharp(bytes).metadata();
    return {
      bytes: await sharp(bytes)
        .rotate()
        .resize({ width: Math.min((meta.width ?? 800) * 2, 2400), withoutEnlargement: false })
        .png()
        .toBuffer(),
      isMock: true,
    };
  }
}
export class TopazImageEnhancementService implements ImageEnhancementService {
  async enhance(input: ImageEnhancementInput) {
    const apiKey = process.env.IMAGE_ENHANCEMENT_API_KEY;
    if (!apiKey) throw Error('请在 .env 配置 Topaz API Key 后重启 worker');
    const base = 'https://api.topazlabs.com/image/v1';
    const headers = { 'X-API-KEY': apiKey };
    let processId = input.processId;
    if (!processId) {
      const form = new FormData();
      form.set('model', process.env.IMAGE_ENHANCEMENT_MODEL ?? 'High Fidelity V2');
      form.set('output_format', 'png');
      const meta = await sharp(input.bytes).metadata();
      const width = Math.min((meta.width ?? 800) * 2, 4000);
      form.set('output_width', String(width));
      form.set('image', new Blob([new Uint8Array(input.bytes)]), 'original.png');
      let res: Response;
      try {
        res = await fetch(base + '/enhance/async', {
          method: 'POST',
          headers,
          body: form,
          signal: AbortSignal.timeout(60000),
        });
      } catch {
        throw new UnknownSubmission('提交结果未知，请到 Topaz 控制台核对后重试');
      }
      if (!res.ok) throw Error('Topaz 提交失败 HTTP ' + res.status);
      const body = await res.json();
      if (typeof body.process_id !== 'string')
        throw new UnknownSubmission('Topaz 未返回任务编号，请核对控制台');
      processId = body.process_id;
      await input.onSubmitted(processId!);
    }
    for (let i = 0; i < 120; i++) {
      await input.heartbeat();
      const r = await fetch(base + '/status/' + encodeURIComponent(processId!), {
        headers,
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw Error('Topaz 状态查询失败 ' + r.status);
      const { status } = await r.json();
      if (['Failed', 'Cancelled'].includes(status)) throw Error('Topaz 任务 ' + status);
      if (status === 'Completed') {
        const download = await fetch(base + '/download/' + encodeURIComponent(processId!), {
          headers,
          signal: AbortSignal.timeout(30000),
        });
        if (!download.ok) throw Error('Topaz 下载地址获取失败');
        const { url } = await download.json();
        const target = new URL(url);
        if (
          target.protocol !== 'https:' ||
          !['topazlabs.com', 'amazonaws.com', 'cloudfront.net', 'storage.googleapis.com'].some(
            (h) => target.hostname === h || target.hostname.endsWith('.' + h),
          )
        )
          throw Error('Topaz 返回了未支持的下载主机');
        const output = await fetch(target, {
          signal: AbortSignal.timeout(60000),
          redirect: 'error',
        });
        if (!output.ok) throw Error('增强图片下载失败');
        const chunks: Uint8Array[] = [];
        let size = 0;
        for await (const chunk of output.body! as unknown as AsyncIterable<Uint8Array>) {
          size += chunk.length;
          if (size > 40 * 1024 * 1024) throw Error('增强输出超过大小限制');
          chunks.push(chunk);
        }
        return { bytes: Buffer.concat(chunks), isMock: false };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw Error('Topaz 处理超时；可重试查询已有任务，不会重新收费提交');
  }
}
export function enhancementProvider(name: string): ImageEnhancementService {
  if (name === 'mock') return new MockImageEnhancementService();
  if (name === 'topaz') return new TopazImageEnhancementService();
  throw Error('当前支持 mock/topaz；Real-ESRGAN 适配器尚未启用');
}
