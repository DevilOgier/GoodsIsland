import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { posterFontSources } from '../../src/poster/fonts';
import { posterImageSize } from '../../src/poster/image-size';

test('请柬仅加载所需字块，预览导出资源一致且不会下载完整宋体', () => {
  const text = '收一些心动收藏三角初华四宫宁月徽章欢迎带价';
  const sources = posterFontSources(['serif', 'chineseSerif', 'handwriting'], text);
  assert.ok(sources.every((source) => !source.url.endsWith('InvitationSong-Semibold.woff2')));
  for (const character of text) {
    const point = character.codePointAt(0)!;
    assert.ok(
      sources.some((source) => {
        if (!source.unicodeRange) return false;
        const [start, end] = source.unicodeRange
          .slice(2)
          .split('-')
          .map((part) => parseInt(part, 16));
        return point >= start && point <= end;
      }),
    );
  }
  const size = sources.reduce((sum, source) => sum + statSync('public' + source.url).size, 0);
  assert.ok(size < 2_000_000, `typical invitation font transfer: ${size}`);
  assert.deepEqual(
    posterFontSources(['chineseSerif'], '月月'),
    posterFontSources(['chineseSerif'], '月'),
  );
});

test('导出图片按占位两倍像素向上选档，不降低到缩略图清晰度', () => {
  assert.equal(posterImageSize(520, 420), 768);
  assert.equal(posterImageSize(1200, 900), 1536);
  assert.equal(posterImageSize(2400, 2400), 2048);
});

test('默认手账预览只请求分包文楷和 WOFF2 西文，不加载宋体或完整中文字库', () => {
  const sources = posterFontSources(
    ['chineseHandwriting', 'sans'],
    '出一些心动收藏谷子名称欢迎询价',
  );
  assert.ok(sources.length > 1);
  assert.ok(sources.every((source) => source.url.endsWith('.woff2')));
  assert.ok(
    sources.every(
      (source) =>
        !source.url.includes('invitation-song') && !source.url.includes('Lite-Regular.woff2'),
    ),
  );
});
