"""Pack the decorations (r/decor, made by decor_sprites.py) into game2/img/atlas/decor.webp, add them to data.json as
'decor' (like the props: drawn at half size), and make the shop pictures game2/img/decor/<id>.webp."""
import os, json
import numpy as np
from PIL import Image
from farmer_pack import shelf_pack

R = os.path.dirname(os.path.abspath(__file__)); SRC = f'{R}/r/decor'; OUT = f'{R}/game2'
SCALE = 0.75          # rendered at 2x map resolution; keep them a touch sharper than 1x for zooming in


def crop(im, pad=3):
    a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 6)
    return max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.size[0], xs.max() + pad + 1), min(im.size[1], ys.max() + pad + 1)


def pack(data):
    meta = json.load(open(f'{SRC}/decor.json')); items, out = [], {}
    for name, m in meta.items():
        im = Image.open(f'{SRC}/{name}.png').convert('RGBA')
        a = np.array(im).astype(np.float32); h, w = a.shape[:2]; F = 40.0          # fade the frame's edges so a long shadow never ends in a straight cut
        fx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / F, 0, 1); fy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / F, 0, 1)
        a[:, :, 3] *= np.minimum(fy[:, None], fx[None, :]); im = Image.fromarray(a.round().astype(np.uint8), 'RGBA')
        x0, y0, x1, y1 = crop(im); c = im.crop((x0, y0, x1, y1))
        c = c.resize((max(1, round(c.size[0] * SCALE)), max(1, round(c.size[1] * SCALE))), Image.LANCZOS)
        e = {'ax': round((m['anchor'][0] - x0) * SCALE, 1), 'ay': round((m['anchor'][1] - y0) * SCALE, 1), 'k': round(1 / (m['k'] * SCALE), 4)}
        if m.get('faceon'): e['ax'], e['ay'] = round((m['px'] / 2 - x0) * SCALE, 1), round((m['px'] / 2 - y0) * SCALE, 1)
        if 'hub' in m: e['hub'] = m['hub']
        items.append((name, c)); out[name] = e
    atlas, pos = shelf_pack(items, max_w=2048)
    atlas.save(f'{OUT}/img/atlas/decor.webp', 'WEBP', quality=84, method=6)
    for n, (x, y, w, h) in pos.items(): out[n].update(x=x, y=y, w=w, h=h)
    data['decor'] = out
    # shop pictures: each decoration on its own (the windmill with its sails), fitted in 340 x 170 at 2x
    os.makedirs(f'{OUT}/img/decor', exist_ok=True)
    for name, m in meta.items():
        if name == 'dc_sails': continue
        im = Image.open(f'{SRC}/{name}.png').convert('RGBA')
        if name == 'dc_windmill' and 'dc_sails' in meta:
            sl = Image.open(f'{SRC}/dc_sails.png').convert('RGBA'); sl = sl.resize((sl.size[0], round(sl.size[1] * 0.743)), Image.LANCZOS)
            hx, hy = m['anchor'][0] + m['hub'][0] * m['k'], m['anchor'][1] + m['hub'][1] * m['k']
            big = Image.new('RGBA', (im.size[0] + sl.size[0], im.size[1] + sl.size[1]), (0, 0, 0, 0)); ox, oy = sl.size[0] // 2, sl.size[1] // 2
            big.alpha_composite(im, (ox, oy)); big.alpha_composite(sl, (round(ox + hx - sl.size[0] / 2), round(oy + hy - sl.size[1] / 2))); im = big
        c = im.crop(crop(im, 6)); s = min(640 / c.size[0], 300 / c.size[1]); c = c.resize((round(c.size[0] * s), round(c.size[1] * s)), Image.LANCZOS)
        c.save(f'{OUT}/img/decor/{name[3:]}.webp', 'WEBP', quality=86, method=6)
    return len(out)


if __name__ == '__main__':
    data = json.load(open(f'{OUT}/data.json'))
    n = pack(data)
    json.dump(data, open(f'{OUT}/data.json', 'w'), separators=(',', ':'))
    print('decor sprites', n)
