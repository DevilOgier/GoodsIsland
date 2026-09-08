import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? '',
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});
const Bucket = process.env.S3_BUCKET ?? 'guzi';
export async function uploadUrl(key: string, mime: string) {
  return getSignedUrl(s3, new PutObjectCommand({ Bucket, Key: key, ContentType: mime }), {
    expiresIn: 300,
  });
}
export async function readObject(key: string) {
  const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
  if (!head.ContentLength || head.ContentLength > 40 * 1024 * 1024)
    throw Error('图片大小不符合限制');
  const response = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  return Buffer.from(await response.Body!.transformToByteArray());
}
export async function putObject(key: string, bytes: Buffer, mime: string) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: bytes, ContentType: mime }));
}
