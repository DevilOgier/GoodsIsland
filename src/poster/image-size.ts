export const posterImageSizes = [256, 512, 768, 1024, 1536, 2048] as const;
export function posterImageSize(width: number, height: number) {
  return posterImageSizes.find((size) => size >= Math.max(width, height)) ?? 2048;
}
