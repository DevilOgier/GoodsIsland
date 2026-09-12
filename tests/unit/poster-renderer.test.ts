import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPoster } from '../../src/poster/renderer';
import type { PosterData, PosterRenderOptions } from '../../src/poster/types';

const transparentPixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const defaultConfig: PosterRenderOptions = {
  palette: '',
  density: 'BALANCED',
  priceStyle: 'PRICE_PROMINENT',
  showNote: true,
};

function items(count: number): PosterData['items'] {
  return Array.from({ length: count }, (_, index) => ({
    productId: `product-${index}`,
    name:
      index % 2
        ? '星月系列吧唧'
        : '这是一个用于验证确定性截断和长中文排版的纪念限定亚克力立牌商品名称',
    quantity: index + 1,
    price: index % 3 === 0 ? '' : (28 + index * 3).toFixed(2),
    note:
      index % 3 === 0
        ? ''
        : index % 3 === 1
          ? '无伤优先'
          : '这是一条很长的备注，用来确认内容过长时模板会截断而不是抛出错误或破坏布局',
    image: index % 2 ? transparentPixel : undefined,
  }));
}

test('四个 V3 模板覆盖常用比例、商品数量和文本边界', () => {
  for (const template of ['polaroid', 'invitation', 'gingham', 'resume']) {
    for (const ratio of ['1:1', '3:4', '4:3']) {
      for (const count of [1, 2, 4, 8]) {
        const svg = renderPoster({
          title: '今日心动收藏',
          type: count % 2 ? 'WANTED' : 'SALE',
          ratio,
          template,
          version: 3,
          config: defaultConfig,
          items: items(count),
        });
        assert.match(svg, /^<svg /);
        assert.match(svg, /<\/svg>$/);
        assert.match(svg, new RegExp(`data-template="${template}"`));
        assert.doesNotMatch(svg, /(?:NaN|undefined)/);
      }
    }
  }
});

test('四个 V3 模板拥有不同视觉结构和收出物语义', () => {
  const outputs = new Map(
    ['polaroid', 'invitation', 'gingham', 'resume'].map((template) => [
      template,
      renderPoster({
        title: '收藏清单',
        type: 'WANTED',
        ratio: '1:1',
        template,
        version: 3,
        items: items(2),
      }),
    ]),
  );

  assert.match(outputs.get('polaroid')!, /data-layout="polaroid-v3"/);
  assert.match(outputs.get('invitation')!, /data-layout="invitation-entry"/);
  assert.match(outputs.get('gingham')!, /data-layout="gingham-card"/);
  assert.match(outputs.get('resume')!, /data-layout="resume-entry"/);
  assert.match(outputs.get('invitation')!, /COLLECTION INVITATION/);
  assert.match(outputs.get('resume')!, /WANTED ITEMS/);
  assert.equal(new Set(outputs.values()).size, 4);
});

test('价格和备注可隐藏，超长内容仍可稳定渲染', () => {
  const svg = renderPoster({
    title: '隐藏次要信息',
    type: 'SALE',
    ratio: '9:16',
    template: 'polaroid',
    version: 3,
    config: {
      palette: 'sage',
      density: 'INFO_FIRST',
      priceStyle: 'PRICE_HIDDEN',
      showNote: false,
    },
    items: items(8),
  });

  assert.doesNotMatch(svg, /无伤优先/);
  assert.doesNotMatch(svg, /¥31\.00/);
  assert.doesNotMatch(svg, /(?:NaN|undefined)/);
});
