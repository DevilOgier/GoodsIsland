import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
mkdirSync('public/icons', { recursive: true });
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="110" fill="#edf0e5"/><g fill="#8c9f76"><ellipse cx="256" cy="184" rx="47" ry="79"/><ellipse cx="256" cy="328" rx="47" ry="79"/><ellipse cx="184" cy="256" rx="79" ry="47"/><ellipse cx="328" cy="256" rx="79" ry="47"/><ellipse cx="205" cy="205" rx="47" ry="67" transform="rotate(-45 205 205)"/><ellipse cx="307" cy="307" rx="47" ry="67" transform="rotate(-45 307 307)"/><ellipse cx="205" cy="307" rx="47" ry="67" transform="rotate(45 205 307)"/><ellipse cx="307" cy="205" rx="47" ry="67" transform="rotate(45 307 205)"/></g><circle cx="256" cy="256" r="43" fill="#faf8ed"/></svg>';
for (const size of [192, 512])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile('public/icons/' + size + '.png');
