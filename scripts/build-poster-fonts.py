"""Offline subset generation. Requires fonttools[woff]; retains the existing OFL font glyphs."""
from concurrent.futures import ProcessPoolExecutor
from fontTools.ttLib import TTFont
from fontTools import subset
from pathlib import Path
import hashlib
import json
import sys

def generate(job):
    source, block, selected, family = job
    font = TTFont(source)
    options = subset.Options()
    options.recalc_timestamp = False
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=selected)
    sub.subset(font)
    font.flavor = 'woff2'
    path = Path(f'public/fonts/{family}/{block:x}.woff2')
    font.save(path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    final = path.with_name(f'{block:x}-{digest}.woff2')
    path.replace(final)
    return {'start': block * 256, 'end': block * 256 + 255, 'url': '/fonts/' + family + '/' + final.name}

if __name__ == '__main__':
    source = sys.argv[1]
    family = sys.argv[2] if len(sys.argv) > 2 else 'invitation-song'
    manifest = sys.argv[3] if len(sys.argv) > 3 else 'src/poster/invitation-font-subsets.json'
    Path('public/fonts/' + family).mkdir(parents=True, exist_ok=True)
    points = sorted(TTFont(source).getBestCmap())
    # Only the codepoints already distributed in InvitationSong are supported.
    points = [p for p in points if p <= 255 or 0x2000 <= p <= 0x206f or 0x3000 <= p <= 0x30ff or 0x3400 <= p <= 0x9fff or 0xff00 <= p <= 0xffef]
    blocks = sorted({p // 256 for p in points})
    with ProcessPoolExecutor(max_workers=4) as pool:
        result = list(pool.map(generate, [(source, b, [p for p in points if p // 256 == b], family) for b in blocks]))
    Path(manifest).write_text(json.dumps(result, indent=2), encoding='utf-8')
    print('Generated', len(result), 'subsets')
