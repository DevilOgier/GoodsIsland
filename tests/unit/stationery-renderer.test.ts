import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPoster, posterImageTargets, ratios } from '../../src/poster/renderer';
import { posterTemplateRegistry } from '../../src/poster/registry';
import { posterFontSources } from '../../src/poster/fonts';

test('新版格纹与档案保留自定义文案、收出物语义、隐藏选项和历史 ID', () => {
  for (const template of ['gingham', 'resume'])
    for (const type of ['SALE', 'WANTED'] as const) {
      const data = {
        title: '自定义标题 <心愿> & 收藏',
        template,
        type,
        ratio: '4:3',
        items: [
          {
            productId: 'one',
            name: '测试谷子',
            quantity: 12345,
            price: '123456.78',
            note: '独有备注甲乙丙',
          },
        ],
      };
      const svg = renderPoster(data);
      assert.match(svg, /自定义标题 &lt;心愿&gt; &amp; 收藏/);
      assert.match(svg, /12345/);
      assert.match(svg, /123456.78/);
      assert.match(svg, /独有备注甲乙丙/);
      if (type === 'WANTED') assert.match(svg, /心理价/);
      const hidden = renderPoster({
        ...data,
        config: { showNote: false, priceStyle: 'PRICE_HIDDEN' as const },
      });
      assert.doesNotMatch(hidden, /123456.78|独有备注甲乙丙/);
      assert.equal(svg, renderPoster(data));
    }
});

test('新版模板所有比例可渲染 1–12 件，高清素材使用实际输出像素', () => {
  for (const template of ['gingham', 'resume'])
    for (const ratio of Object.keys(ratios))
      for (let n = 1; n <= 12; n++) {
        const data = {
          title: '今日收藏',
          template,
          type: 'SALE' as const,
          ratio,
          items: Array.from({ length: n }, (_, i) => ({
            productId: String(i),
            name: '长名称亚克力立牌'.repeat(4),
            quantity: 12345,
            price: '',
            note: '',
          })),
        };
        const svg = renderPoster(data);
        assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
        assert.equal([...svg.matchAll(/data-layout="(?:gingham-card|resume-entry)"/g)].length, n);
        const [width, height] = ratios[ratio];
        for (const target of posterImageTargets(data).values()) {
          assert.ok(target.displayWidth > 0 && target.displayWidth <= width);
          assert.ok(target.displayHeight > 0 && target.displayHeight <= height);
        }
      }
  const data = {
    title: '比例探针',
    template: 'gingham',
    type: 'SALE' as const,
    ratio: '4:3',
    items: [{ productId: 'one', name: '商品', quantity: 1, price: '35', note: '' }],
  };
  const a = posterImageTargets(data).get('one')!;
  const b = posterImageTargets({ ...data, ratio: '16:9' }).get('one')!;
  assert.equal(a.displayWidth, b.displayWidth);
  const square = posterImageTargets({ ...data, ratio: '1:1' }).get('one')!;
  assert.equal(square.displayWidth, a.displayWidth * 0.75);
});

test('模板字体分包按需加载，配色可切换，不回退完整中文字库', () => {
  for (const template of ['gingham', 'resume']) {
    const definition = posterTemplateRegistry.get(template)!;
    const sources = posterFontSources(definition.previewFonts!, '今日出物收藏徽章心理价');
    assert.ok(sources.every((s) => s.url.endsWith('.woff2')));
    assert.ok(
      sources.every(
        (s) =>
          !s.url.endsWith('LXGWWenKaiLite-Regular.woff2') &&
          !s.url.endsWith('InvitationSong-Semibold.woff2'),
      ),
    );
    const data = {
      title: '今日收藏',
      template,
      type: 'SALE' as const,
      ratio: '1:1',
      items: [{ productId: 'one', name: '徽章', quantity: 1, price: '35', note: '' }],
    };
    const base = renderPoster(data),
      variant = renderPoster({ ...data, config: { palette: definition.palettes[1].id } });
    assert.notEqual(base, variant);
    assert.ok(variant.includes(definition.palettes[1].background));
  }
});
