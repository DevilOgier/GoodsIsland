import sharp from 'sharp';
import { readObject } from './storage';

const cache = new Map<string, Promise<Buffer>>();
const sizes = new Map<string, number>();
const limit = 32 * 1024 * 1024;
let bytes = 0;

// Authorization is performed by the image endpoint before every cache lookup.
export function posterImage(objectKey: string, size: number) {
  const key = `${objectKey}:${size}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const request = readObject(objectKey)
    .then((source) =>
      sharp(source)
        .rotate()
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 94, effort: 2 })
        .toBuffer(),
    )
    .then((buffer) => {
      sizes.set(key, buffer.length);
      bytes += buffer.length;
      for (const [oldest, length] of sizes) {
        if (bytes <= limit && sizes.size <= 64) break;
        cache.delete(oldest);
        sizes.delete(oldest);
        bytes -= length;
      }
      return buffer;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, request);
  return request;
}
